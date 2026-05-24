"use client"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

export class AIClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown = null,
    public code: string | null = null,
  ) {
    super(message)
    this.name = "AIClientError"
  }
}

export type EdgeFunctionName =
  | "ai-analyze"
  | "ai-parse-text"
  | "ai-scan-menu"
  | "ai-personalize-goals"
  | "ai-extract-labs"
  | "food-search"
  | "barcode-lookup"

// Mirror of the AnthropicErrorCode union on the edge side. Server is the
// source of truth; this is just for friendlier messages when the server
// envelope carries a `code` field.
const MESSAGES_BY_CODE: Record<string, string> = {
  api_key_missing: "IA não configurada no servidor. Avise o suporte.",
  anthropic_auth: "Credenciais de IA inválidas. Avise o suporte.",
  anthropic_model_not_found: "Modelo de IA indisponível. Estamos investigando.",
  anthropic_rate_limit: "Muitas requisições no momento. Aguarde alguns segundos e tente de novo.",
  anthropic_overloaded: "IA sobrecarregada. Tente novamente em alguns segundos.",
  anthropic_invalid_request: "Não consegui processar essa imagem. Tente outra foto com mais luz e foco.",
  anthropic_5xx: "IA com problema temporário. Tente de novo em instantes.",
  anthropic_network: "Falha de rede ao falar com a IA. Tente de novo.",
  anthropic_unknown: "IA com problema temporário. Tente de novo em instantes.",
}

function userMessage(status: number, fallback: string): string {
  switch (status) {
    case 401:
      return "Sua sessão expirou. Faça login novamente."
    case 403:
      return "IA indisponível para sua conta. Entre em contato com o suporte."
    case 429:
      return "Limite diário de uso de IA atingido. Tente novamente mais tarde."
    case 503:
      return "Recursos de IA estão temporariamente indisponíveis. Tente novamente em alguns minutos."
    case 502:
      return "Tivemos um problema ao processar a resposta. Tente novamente."
    default:
      return fallback
  }
}

export interface CallEdgeOptions {
  /** Hard timeout per attempt, ms. Defaults to 60s — long enough for Opus on photo analysis. */
  timeoutMs?: number
  /** Number of EXTRA attempts after the first one fails transiently. Defaults to 1 (so up to 2 total). */
  retries?: number
}

const DEFAULT_TIMEOUT_MS = 60_000
const DEFAULT_RETRIES = 1

// Codes that won't self-heal — don't retry, just surface the message.
const NON_RETRYABLE_CODES = new Set([
  "api_key_missing",
  "anthropic_auth",
  "anthropic_model_not_found",
  "anthropic_invalid_request",
])

function shouldRetry(status: number, code: string | null): boolean {
  if (code && NON_RETRYABLE_CODES.has(code)) return false
  // 0 == network/abort. 408 == request timeout. 5xx == backend transient.
  // Don't retry 4xx (auth, quota, bad input) — would just burn the user's quota.
  return status === 0 || status === 408 || (status >= 500 && status < 600)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Call a Supabase Edge Function with the current user's JWT.
 * Throws AIClientError on non-2xx responses with a user-friendly message.
 *
 * Defends against the silent-hang failure mode: each attempt has a hard
 * AbortSignal timeout, and transient network/5xx errors retry once with a
 * short backoff so a single dropped packet doesn't kill the meal log flow.
 */
export async function callEdgeFunction<TResponse, TBody = unknown>(
  name: EdgeFunctionName,
  body: TBody,
  options: CallEdgeOptions = {},
): Promise<TResponse> {
  if (!isSupabaseConfigured()) {
    throw new AIClientError(503, "Backend não configurado.")
  }

  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new AIClientError(401, userMessage(401, ""))
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) {
    throw new AIClientError(503, "Backend não configurado.")
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/functions/v1/${name}`
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxAttempts = 1 + Math.max(0, options.retries ?? DEFAULT_RETRIES)

  let lastErr: AIClientError | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "TimeoutError"
      const message = isAbort
        ? "A IA demorou demais para responder. Tentando de novo..."
        : err instanceof Error
          ? err.message
          : "Erro de rede"
      lastErr = new AIClientError(0, message)
      if (attempt < maxAttempts) {
        await sleep(750 * attempt)
        continue
      }
      throw lastErr
    }

    // Try to parse JSON either way; some error paths return a JSON envelope
    let data: unknown = null
    try {
      data = await res.json()
    } catch {
      // ignore
    }

    if (!res.ok) {
      const envelope = (data && typeof data === "object" ? data : {}) as Record<string, unknown>
      const code = typeof envelope.code === "string" ? envelope.code : null
      const serverMessage = typeof envelope.error === "string" ? envelope.error : null
      // Prefer the server's PT-BR string when present (the edge function knows
      // exactly what went wrong); fall back to a code-based string; finally to
      // the generic status-based string. This prevents the user from ever
      // seeing the old opaque "AI service error".
      const message =
        (code && MESSAGES_BY_CODE[code]) ??
        serverMessage ??
        userMessage(res.status, "Erro ao processar.")
      lastErr = new AIClientError(res.status, message, data, code)
      if (attempt < maxAttempts && shouldRetry(res.status, code)) {
        await sleep(750 * attempt)
        continue
      }
      throw lastErr
    }

    return data as TResponse
  }

  // Defensive — should be unreachable, the loop always returns or throws.
  throw lastErr ?? new AIClientError(0, "Erro desconhecido")
}
