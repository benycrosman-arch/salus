// Thin wrapper around Anthropic Messages API.
// Reads ANTHROPIC_API_KEY from Deno env — never accepts it as a parameter.

export const MODEL_ID = "claude-sonnet-4-6"
export const MODEL_OPUS = "claude-opus-4-7"   // Used for vision-heavy meal analysis
export const ANTHROPIC_VERSION = "2023-06-01"

type CacheControl = { type: "ephemeral" }

type SystemBlock = { type: "text"; text: string; cache_control?: CacheControl }

type ImageSource = { type: "base64"; media_type: string; data: string }

type PdfSource = { type: "base64"; media_type: "application/pdf"; data: string }

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: ImageSource }
  | { type: "document"; source: PdfSource }

export type AnthropicResponse = {
  content: Array<{ type: string; text?: string }>
  usage?: { input_tokens?: number; output_tokens?: number }
}

export type CallOptions = {
  system: SystemBlock[]
  messages: Array<{ role: "user" | "assistant"; content: string | ContentBlock[] }>
  maxTokens: number
  /** Override the default Sonnet — used for ai-analyze (Opus 4.7). */
  model?: string
  /**
   * If the primary model returns `anthropic_model_not_found`, transparently
   * retry once with this fallback (e.g. Sonnet 4.6 when Opus 4.7 isn't
   * entitled). Use only for vision-critical calls where partial degradation
   * is preferable to a hard failure.
   */
  fallbackModel?: string
}

export type AnthropicErrorCode =
  | "api_key_missing"
  | "anthropic_auth"            // 401 / 403
  | "anthropic_model_not_found" // 404
  | "anthropic_rate_limit"      // 429
  | "anthropic_overloaded"      // 529
  | "anthropic_invalid_request" // 400
  | "anthropic_5xx"             // 500/502/503/504
  | "anthropic_network"         // fetch threw / aborted
  | "anthropic_unknown"

/**
 * Carries enough detail for callers to map to a user-facing PT-BR string and
 * for logs to pinpoint the real cause. `status` is what the edge function
 * should return to the client; `upstreamStatus` is the raw Anthropic HTTP
 * code (or 0 for network errors / missing-key).
 */
export class AnthropicError extends Error {
  readonly code: AnthropicErrorCode
  readonly upstreamStatus: number
  readonly status: number
  readonly bodyExcerpt: string

  constructor(args: {
    code: AnthropicErrorCode
    upstreamStatus: number
    message: string
    bodyExcerpt?: string
  }) {
    super(args.message)
    this.name = "AnthropicError"
    this.code = args.code
    this.upstreamStatus = args.upstreamStatus
    this.bodyExcerpt = args.bodyExcerpt ?? ""
    this.status = statusForCode(args.code)
  }
}

function statusForCode(code: AnthropicErrorCode): number {
  switch (code) {
    case "api_key_missing":
    case "anthropic_auth":
    case "anthropic_model_not_found":
    case "anthropic_overloaded":
      return 503
    case "anthropic_rate_limit":
      return 429
    case "anthropic_invalid_request":
      return 400
    case "anthropic_5xx":
    case "anthropic_network":
    case "anthropic_unknown":
    default:
      return 502
  }
}

function classify(upstreamStatus: number, body: string): AnthropicErrorCode {
  // Prefer Anthropic's own error.type when present — status alone is ambiguous.
  let errorType: string | null = null
  try {
    const parsed = JSON.parse(body) as { error?: { type?: string } }
    errorType = parsed?.error?.type ?? null
  } catch {
    // body wasn't JSON; fall back to status-based mapping below
  }

  if (errorType === "authentication_error" || errorType === "permission_error") return "anthropic_auth"
  if (errorType === "not_found_error") return "anthropic_model_not_found"
  if (errorType === "rate_limit_error") return "anthropic_rate_limit"
  if (errorType === "overloaded_error") return "anthropic_overloaded"
  if (errorType === "invalid_request_error") return "anthropic_invalid_request"
  if (errorType === "api_error") return "anthropic_5xx"

  if (upstreamStatus === 401 || upstreamStatus === 403) return "anthropic_auth"
  if (upstreamStatus === 404) return "anthropic_model_not_found"
  if (upstreamStatus === 429) return "anthropic_rate_limit"
  if (upstreamStatus === 529) return "anthropic_overloaded"
  if (upstreamStatus === 400) return "anthropic_invalid_request"
  if (upstreamStatus >= 500 && upstreamStatus < 600) return "anthropic_5xx"
  return "anthropic_unknown"
}

function isTransient(code: AnthropicErrorCode): boolean {
  return code === "anthropic_overloaded" || code === "anthropic_5xx" || code === "anthropic_network"
}

function backoffMs(attempt: number): number {
  // 300ms, 900ms with ±20% jitter
  const base = attempt === 1 ? 300 : 900
  const jitter = (Math.random() - 0.5) * 0.4 * base
  return Math.round(base + jitter)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const MAX_RETRIES = 2  // total attempts = 1 primary + up to 2 retries
const REQUEST_TIMEOUT_MS = 55_000  // Supabase Edge Functions cap at ~60s

async function doOne(apiKey: string, model: string, opts: CallOptions): Promise<AnthropicResponse> {
  let res: Response
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens,
        system: opts.system,
        messages: opts.messages,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === "TimeoutError"
    throw new AnthropicError({
      code: "anthropic_network",
      upstreamStatus: 0,
      message: isAbort ? "Anthropic request timed out" : `Anthropic fetch failed: ${(err as Error).message}`,
    })
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    const code = classify(res.status, body)
    throw new AnthropicError({
      code,
      upstreamStatus: res.status,
      message: `Anthropic API error (${res.status} ${code}): ${body.slice(0, 200)}`,
      bodyExcerpt: body.slice(0, 500),
    })
  }

  return await res.json() as AnthropicResponse
}

export async function callAnthropic(opts: CallOptions): Promise<AnthropicResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
  if (!apiKey) {
    throw new AnthropicError({
      code: "api_key_missing",
      upstreamStatus: 0,
      message: "ANTHROPIC_API_KEY not configured in Edge Function secrets",
    })
  }

  const primary = opts.model ?? MODEL_ID

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await doOne(apiKey, primary, opts)
    } catch (err) {
      if (!(err instanceof AnthropicError)) throw err

      // Model-not-found → fall back transparently (no retry on primary first;
      // a 404 won't self-heal). One shot at the fallback only.
      if (err.code === "anthropic_model_not_found" && opts.fallbackModel && opts.fallbackModel !== primary) {
        console.warn(
          `anthropic fallback model=${primary} → fallback=${opts.fallbackModel} reason=${err.code} upstream=${err.upstreamStatus}`,
        )
        return await doOne(apiKey, opts.fallbackModel, opts)
      }

      if (isTransient(err.code) && attempt < MAX_RETRIES) {
        const delay = backoffMs(attempt + 1)
        console.warn(
          `anthropic retry attempt=${attempt + 1} code=${err.code} upstream=${err.upstreamStatus} delay_ms=${delay}`,
        )
        await sleep(delay)
        continue
      }

      throw err
    }
  }

  // Defensive — the loop above always returns or throws.
  throw new AnthropicError({
    code: "anthropic_unknown",
    upstreamStatus: 0,
    message: "Anthropic call exhausted retries without resolution",
  })
}

/**
 * Extract the first text block from an Anthropic response, stripping
 * markdown code fences if the model wrapped JSON in them.
 */
export function extractText(resp: AnthropicResponse): string {
  const block = resp.content.find((b) => b.type === "text")
  if (!block || typeof block.text !== "string") return ""
  let text = block.text.trim()
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
  }
  return text
}

export function totalTokens(resp: AnthropicResponse): number {
  return (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0)
}
