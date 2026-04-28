// Thin wrapper around Anthropic Messages API.
// Reads ANTHROPIC_API_KEY from Deno env — never accepts it as a parameter.

export const MODEL_ID = "claude-sonnet-4-6"
export const MODEL_OPUS = "claude-opus-4-7"   // Used for vision-heavy meal analysis
export const ANTHROPIC_VERSION = "2023-06-01"

type CacheControl = { type: "ephemeral" }

type SystemBlock = { type: "text"; text: string; cache_control?: CacheControl }

type ImageSource = { type: "base64"; media_type: string; data: string }

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: ImageSource }

export type AnthropicResponse = {
  content: Array<{ type: string; text?: string }>
  usage?: { input_tokens?: number; output_tokens?: number }
}

export type CallOptions = {
  system: SystemBlock[]
  messages: Array<{ role: "user" | "assistant"; content: string | ContentBlock[] }>
  maxTokens: number
  model?: string  // Override the default Sonnet — used for ai-analyze (Opus 4.7)
}

export class AnthropicError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "AnthropicError"
  }
}

export async function callAnthropic(opts: CallOptions): Promise<AnthropicResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
  if (!apiKey) {
    throw new AnthropicError(503, "ANTHROPIC_API_KEY not configured")
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? MODEL_ID,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: opts.messages,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new AnthropicError(
      res.status >= 500 ? 502 : 500,
      `Anthropic API error (${res.status}): ${detail.slice(0, 200)}`,
    )
  }

  return await res.json() as AnthropicResponse
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
