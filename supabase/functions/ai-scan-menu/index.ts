// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { authenticate, serviceClient } from "../_shared/auth.ts"
import { checkRateLimit } from "../_shared/rate-limit.ts"
import { checkKillSwitches } from "../_shared/kill-switch.ts"
import { validateImageRequest } from "../_shared/sanitize.ts"
import { filterOutput } from "../_shared/filter-output.ts"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { callAnthropic, extractText, totalTokens, AnthropicError } from "../_shared/anthropic.ts"
import { logUsage } from "../_shared/log-usage.ts"
import { MENU_SYSTEM, MENU_USER_PROMPT } from "../_shared/prompts.ts"
import { parseMediaType } from "../_shared/score.ts"

const FUNCTION_NAME = "ai-scan-menu"

function uuid(): string {
  return crypto.randomUUID()
}

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

    const resp = await callAnthropic({
      maxTokens: 4096,
      system: [
        { type: "text", text: MENU_SYSTEM, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: MENU_USER_PROMPT },
          ],
        },
      ],
    })

    const rawText = extractText(resp)
    const filtered = filterOutput(rawText)
    if (!filtered.safe) {
      console.warn(`Output filter triggered (${filtered.reason})`)
      return jsonResponse({ error: "Resposta inválida. Tente novamente." }, 502, origin)
    }

    let parsed: { unreadable?: boolean; rawNotes?: string | null; items?: any[] }
    try {
      parsed = JSON.parse(filtered.output)
    } catch {
      return jsonResponse({ error: "Failed to parse menu scan" }, 502, origin)
    }

    const unreadable = Boolean(parsed.unreadable)
    const rawItems = Array.isArray(parsed.items) ? parsed.items : []

    if (!unreadable && rawItems.length === 0) {
      return jsonResponse(
        {
          error: "Nenhum prato identificado. Tente outra foto com mais luz e foco.",
          unreadable: true,
          rawNotes: parsed.rawNotes ?? null,
          items: [],
        },
        400,
        origin,
      )
    }

    const items = rawItems.map((row: any) => ({
      id: uuid(),
      name: String(row?.name ?? "").trim() || "Item",
      priceText: row?.priceText ?? null,
      section: row?.section ?? null,
    }))

    const service = serviceClient()
    await logUsage(service, {
      userId: user.id,
      tokens: totalTokens(resp),
      edgeFunction: FUNCTION_NAME,
    })

    console.log(`ai-scan-menu ok user=${user.id.slice(0, 8)} tokens=${totalTokens(resp)}`)

    return jsonResponse(
      { unreadable, rawNotes: parsed.rawNotes ?? null, items },
      200,
      origin,
    )
  } catch (err) {
    if (err instanceof AnthropicError) {
      return jsonResponse({ error: "AI service error" }, err.status, origin)
    }
    console.error("ai-scan-menu unexpected error:", (err as Error).message)
    return jsonResponse({ error: "Internal server error" }, 500, origin)
  }
})
