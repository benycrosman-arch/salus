"use client"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

export class AIClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown = null,
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
  | "food-search"
  | "barcode-lookup"

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

function shouldRetry(status: number): boolean {
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
      const fallback =
        (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : null) ?? "Erro ao processar."
      lastErr = new AIClientError(res.status, userMessage(res.status, fallback), data)
      if (attempt < maxAttempts && shouldRetry(res.status)) {
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
