// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { authenticate, serviceClient } from "../_shared/auth.ts"
import { checkRateLimit } from "../_shared/rate-limit.ts"
import { checkKillSwitches } from "../_shared/kill-switch.ts"
import { validateImageRequest } from "../_shared/sanitize.ts"
import { filterOutput } from "../_shared/filter-output.ts"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { callAnthropic, extractText, totalTokens, AnthropicError, MODEL_OPUS } from "../_shared/anthropic.ts"
import { logUsage } from "../_shared/log-usage.ts"
import {
  ANALYZE_STAGE1_SYSTEM,
  buildStage1UserPrompt,
  ANALYZE_STAGE2_SYSTEM,
  ANALYZE_STAGE2_USER_PROMPT,
} from "../_shared/prompts.ts"
import { sanitizeText } from "../_shared/sanitize.ts"
import { logAbuse } from "../_shared/log-usage.ts"
import { calculateMealScore, parseMediaType } from "../_shared/score.ts"
import { buildNutritionContext } from "../_shared/nutrition-context.ts"
import { groundFoods, sumGrounded, type Stage1Food, type GroundedFood } from "../_shared/food-grounding.ts"

const FUNCTION_NAME = "ai-analyze"

/**
 * Two-stage RAG pipeline:
 *
 *   Stage 1 (vision)     — LLM identifies foods + portion only (NO macros)
 *   Lookup (database)    — search canonical foods table for each item
 *   Compute (deterministic) — macros = DB(per-100g) × grams (no LLM hallucination)
 *   Stage 2 (qualitative)— LLM writes feedback, score inputs, swap suggestions
 *   Score (deterministic)— mealScore from fiber/glycemic/processed
 *
 * If any food can't be matched in the DB, we fall back to LLM-estimated macros
 * for that single item but flag `source: "estimated"` so users know.
 */
serve(async (req) => {
  const origin = req.headers.get("Origin")

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin)
  }

  try {
    const auth = await authenticate(req)
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status, origin)
    const { user, supabase } = auth

    const allowed = await checkRateLimit(supabase, user.id)
    if (!allowed) {
      return jsonResponse({ error: "Rate limit exceeded" }, 429, origin, { "Retry-After": "60" })
    }

    const kill = await checkKillSwitches(supabase, user.id)
    if (!kill.allowed) {
      return jsonResponse({ error: kill.error }, kill.status, origin)
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400, origin)
    }

    const validation = validateImageRequest(body)
    if (!validation.valid) {
      return jsonResponse({ error: validation.error }, 400, origin)
    }

    const { mediaType, base64, error: mediaError } = parseMediaType(body.image)
    if (mediaError) {
      return jsonResponse({ error: mediaError }, 400, origin)
    }

    // Optional user-provided text — sanitised against prompt injection
    let userText = ""
    if (typeof body.text === "string" && body.text.trim().length > 0) {
      const trimmed = body.text.trim().slice(0, 500)
      const safe = sanitizeText(trimmed, "User context")
      if (!safe.safe) {
        const service = serviceClient()
        await logAbuse(service, {
          userId: user.id,
          type: "prompt_injection",
          content: trimmed,
          edgeFunction: FUNCTION_NAME,
        })
        // Don't fail the request — just drop the text and continue with image only
        console.warn(`Stage1 text sanitised user=${user.id.slice(0, 8)}`)
      } else {
        userText = trimmed
      }
    }

    const userContext = await buildNutritionContext(supabase, user.id)

    // ─── STAGE 1: identify + portion (Opus 4.7 — vision) ──────
    // Opus is markedly stronger at portion estimation, food disambiguation
    // (mashed potatoes vs eggs, etc.), and Brazilian dish recognition.
    const stage1Resp = await callAnthropic({
      model: MODEL_OPUS,
      maxTokens: 2000,
      system: [
        {
          type: "text",
          text: `${ANALYZE_STAGE1_SYSTEM}\n${userContext}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: buildStage1UserPrompt(userText) },
          ],
        },
      ],
    })

    const stage1Text = extractText(stage1Resp)
    const stage1Filtered = filterOutput(stage1Text)
    if (!stage1Filtered.safe) {
      console.warn(`Stage1 output filter triggered (${stage1Filtered.reason})`)
      return jsonResponse({ error: "Análise inválida. Tente novamente." }, 502, origin)
    }

    let stage1: { foods: Stage1Food[]; photoQualityIssue?: boolean; correctionPrompt?: string | null }
    try {
      stage1 = JSON.parse(stage1Filtered.output)
    } catch {
      return jsonResponse({ error: "Failed to parse meal identification" }, 502, origin)
    }

    if (stage1.photoQualityIssue) {
      return jsonResponse(
        {
          foods: [],
          totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
          fiberDiversityCount: 0,
          glycemicImpact: "low",
          processedFoodRatio: 0,
          mealScore: 0,
          feedback: stage1.correctionPrompt ?? "Foto com baixa qualidade. Tire outra com mais luz.",
          swapSuggestions: [],
          photoQualityIssue: true,
          correctionPrompt: stage1.correctionPrompt ?? null,
        },
        200,
        origin,
      )
    }

    if (!Array.isArray(stage1.foods) || stage1.foods.length === 0) {
      return jsonResponse(
        { error: "Nenhum alimento identificado. Tente outra foto." },
        400,
        origin,
      )
    }

    // ─── DB GROUNDING ───────────────────────────────────────
    const { grounded, unmatched, food_refs } = await groundFoods(supabase, stage1.foods)

    // ─── FALLBACK: estimate macros for unmatched foods via LLM ─
    let fallbackTokens = 0
    let fallbackGrounded: GroundedFood[] = []
    if (unmatched.length > 0) {
      const fallbackResp = await callAnthropic({
        maxTokens: 800,
        system: [
          {
            type: "text",
            text: "You are a nutrition estimator. For each food + grams, output macros (kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg) per the given portion. Return ONLY valid JSON: { foods: [{ name, estimatedCalories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, isProcessed }] }",
          },
        ],
        messages: [
          {
            role: "user",
            content: JSON.stringify(
              unmatched.map((f) => ({ name: f.name, grams: f.estimated_grams, cooking_method: f.cooking_method })),
            ),
          },
        ],
      })
      fallbackTokens = totalTokens(fallbackResp)
      try {
        const parsed = JSON.parse(extractText(fallbackResp))
        if (Array.isArray(parsed.foods)) {
          fallbackGrounded = parsed.foods.map((p: any, i: number): GroundedFood => ({
            name: unmatched[i]?.name ?? p.name ?? "Item",
            estimated_grams: unmatched[i]?.estimated_grams ?? 0,
            cooking_method: unmatched[i]?.cooking_method,
            confidence: unmatched[i]?.confidence ?? "low",
            visualReasoning: unmatched[i]?.visualReasoning,
            alternative: unmatched[i]?.alternative_name ?? null,
            food_id: null,
            resolved_name: null,
            match_score: 0,
            match_reason: null,
            estimatedCalories: Number(p.estimatedCalories) || 0,
            protein_g: Number(p.protein_g) || 0,
            carbs_g: Number(p.carbs_g) || 0,
            fat_g: Number(p.fat_g) || 0,
            fiber_g: Number(p.fiber_g) || 0,
            sodium_mg: Number(p.sodium_mg) || 0,
            micronutrients: {},
            isProcessed: Boolean(p.isProcessed),
            source: "estimated",
          }))
        }
      } catch (err) {
        console.warn("Fallback estimation parse failed:", (err as Error).message)
      }
    }

    const allFoods = [...grounded, ...fallbackGrounded]
    const totals = sumGrounded(allFoods)

    // ─── STAGE 2: qualitative analysis ──────────────────────
    const stage2Resp = await callAnthropic({
      maxTokens: 600,
      system: [
        { type: "text", text: ANALYZE_STAGE2_SYSTEM, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content:
            ANALYZE_STAGE2_USER_PROMPT +
            "\n\nMeal data:\n" +
            JSON.stringify({
              foods: allFoods.map((f) => ({
                name: f.resolved_name ?? f.name,
                grams: f.estimated_grams,
                kcal: f.estimatedCalories,
                protein_g: f.protein_g,
                carbs_g: f.carbs_g,
                fat_g: f.fat_g,
                fiber_g: f.fiber_g,
                source: f.source,
                isProcessed: f.isProcessed,
              })),
              totals,
            }),
        },
      ],
    })

    const stage2Text = extractText(stage2Resp)
    const stage2Filtered = filterOutput(stage2Text)
    if (!stage2Filtered.safe) {
      console.warn(`Stage2 output filter triggered (${stage2Filtered.reason})`)
    }

    let stage2: {
      fiberDiversityCount?: number
      glycemicImpact?: "low" | "medium" | "high"
      processedFoodRatio?: number
      feedback?: string
      swapSuggestions?: string[]
    } = {}
    try {
      stage2 = JSON.parse(stage2Filtered.safe ? stage2Filtered.output : "{}")
    } catch {
      // Stage 2 is optional — degrade gracefully
    }

    const fiberDiversity = Math.max(0, Number(stage2.fiberDiversityCount) || allFoods.length)
    const glycemic: "low" | "medium" | "high" = ["low", "medium", "high"].includes(String(stage2.glycemicImpact))
      ? (stage2.glycemicImpact as "low" | "medium" | "high")
      : totals.fiber > 8 ? "low" : totals.carbs > 80 ? "high" : "medium"
    const processed = Math.min(1, Math.max(0, Number(stage2.processedFoodRatio) || allFoods.filter((f) => f.isProcessed).length / Math.max(1, allFoods.length)))

    const mealScore = calculateMealScore(fiberDiversity, glycemic, processed)

    // ─── LOG USAGE ──────────────────────────────────────────
    const tokens = totalTokens(stage1Resp) + fallbackTokens + totalTokens(stage2Resp)
    const service = serviceClient()
    await logUsage(service, {
      userId: user.id,
      tokens,
      edgeFunction: FUNCTION_NAME,
      model: MODEL_OPUS,  // Stage 1 dominates token usage (vision)
    })

    console.log(
      `ai-analyze ok user=${user.id.slice(0, 8)} foods=${allFoods.length} grounded=${grounded.length}/${allFoods.length} tokens=${tokens}`,
    )

    return jsonResponse(
      {
        foods: allFoods.map((f) => ({
          name: f.resolved_name ?? f.name,
          quantity: `${Math.round(f.estimated_grams)}`,
          unit: "g",
          estimatedCalories: f.estimatedCalories,
          protein_g: f.protein_g,
          carbs_g: f.carbs_g,
          fat_g: f.fat_g,
          fiber_g: f.fiber_g,
          isProcessed: f.isProcessed,
          confidence: f.confidence,
          cookingMethod: f.cooking_method ?? "",
          visualReasoning: f.visualReasoning ?? "",
          alternative: f.alternative,
          food_id: f.food_id,
          source: f.source,
          match_reason: f.match_reason,
        })),
        totalMacros: {
          calories: Math.round(totals.calories),
          protein: Math.round(totals.protein),
          carbs: Math.round(totals.carbs),
          fat: Math.round(totals.fat),
          fiber: Math.round(totals.fiber * 10) / 10,
          sugar: 0,
        },
        micronutrients: totals.micronutrients,
        fiberDiversityCount: fiberDiversity,
        glycemicImpact: glycemic,
        processedFoodRatio: processed,
        mealScore,
        feedback: stage2.feedback ?? "Análise concluída.",
        swapSuggestions: Array.isArray(stage2.swapSuggestions) ? stage2.swapSuggestions.slice(0, 2) : [],
        photoQualityIssue: false,
        correctionPrompt: null,
        food_refs,
        groundingStats: {
          total: allFoods.length,
          db_matched: grounded.length,
          estimated: fallbackGrounded.length,
        },
      },
      200,
      origin,
    )
  } catch (err) {
    if (err instanceof AnthropicError) {
      return jsonResponse({ error: "AI service error" }, err.status, origin)
    }
    console.error(`${FUNCTION_NAME} unexpected error:`, (err as Error).message)
    return jsonResponse({ error: "Internal server error" }, 500, origin)
  }
})
