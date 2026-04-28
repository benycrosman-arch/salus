// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { authenticate, serviceClient } from "../_shared/auth.ts"
import { checkRateLimit } from "../_shared/rate-limit.ts"
import { checkKillSwitches } from "../_shared/kill-switch.ts"
import { sanitizeText, validateTextRequest } from "../_shared/sanitize.ts"
import { filterOutput } from "../_shared/filter-output.ts"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { callAnthropic, extractText, totalTokens, AnthropicError } from "../_shared/anthropic.ts"
import { logAbuse, logUsage } from "../_shared/log-usage.ts"
import {
  parseTextSystemPrompt,
  parseTextUserPrompt,
  PARSE_TEXT_BIAS,
  type ParseTextBias,
} from "../_shared/prompts.ts"

const FUNCTION_NAME = "ai-parse-text"

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

    // Accept "text" (preferred) or "message" for compatibility
    const rawText = String(body.text ?? body.message ?? "")
    const validation = validateTextRequest({ text: rawText }, { maxLength: 1500, minLength: 2 })
    if (!validation.valid) {
      return jsonResponse({ error: validation.error }, 400, origin)
    }

    const sanitized = sanitizeText(rawText, "User food log")
    if (!sanitized.safe) {
      const service = serviceClient()
      await logAbuse(service, {
        userId: user.id,
        type: "prompt_injection",
        content: rawText,
        edgeFunction: FUNCTION_NAME,
      })
      console.warn(`Prompt injection blocked (${sanitized.reason}) user=${user.id.slice(0, 8)}`)
      return jsonResponse({ error: "Invalid request" }, 400, origin)
    }

    const biasInput = String(body.bias ?? "balanced") as ParseTextBias
    const bias: ParseTextBias = (Object.keys(PARSE_TEXT_BIAS) as ParseTextBias[]).includes(biasInput)
      ? biasInput
      : "balanced"
    const restaurantRaw = typeof body.restaurant === "string" ? body.restaurant.slice(0, 80).trim() : ""
    const restaurant = restaurantRaw || undefined

    const resp = await callAnthropic({
      maxTokens: 2000,
      system: [
        {
          type: "text",
          text: parseTextSystemPrompt(bias, restaurant),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        { role: "user", content: parseTextUserPrompt(sanitized.sanitized, restaurant) },
      ],
    })

    const rawOut = extractText(resp)
    const filtered = filterOutput(rawOut)
    if (!filtered.safe) {
      console.warn(`Output filter triggered (${filtered.reason})`)
      return jsonResponse({ error: "Análise inválida. Tente novamente." }, 502, origin)
    }

    let parsed: any
    try {
      parsed = JSON.parse(filtered.output)
    } catch {
      return jsonResponse({ error: "Failed to parse foods" }, 502, origin)
    }

    if (Array.isArray(parsed.items)) {
      parsed.items = parsed.items.map((item: Record<string, unknown>, i: number) => ({
        ...item,
        id: `item-${Date.now()}-${i}`,
      }))
    }

    const service = serviceClient()
    await logUsage(service, {
      userId: user.id,
      tokens: totalTokens(resp),
      edgeFunction: FUNCTION_NAME,
    })

    console.log(`ai-parse-text ok user=${user.id.slice(0, 8)} tokens=${totalTokens(resp)}`)

    return jsonResponse(parsed, 200, origin)
  } catch (err) {
    if (err instanceof AnthropicError) {
      return jsonResponse({ error: "AI service error" }, err.status, origin)
    }
    console.error("ai-parse-text unexpected error:", (err as Error).message)
    return jsonResponse({ error: "Internal server error" }, 500, origin)
  }
})
