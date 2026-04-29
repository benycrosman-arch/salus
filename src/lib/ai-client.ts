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
  | "verify-nutri-credential"

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

/**
 * Call a Supabase Edge Function with the current user's JWT.
 * Throws AIClientError on non-2xx responses with a user-friendly message.
 */
export async function callEdgeFunction<TResponse, TBody = unknown>(
  name: EdgeFunctionName,
  body: TBody,
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

  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new AIClientError(0, err instanceof Error ? err.message : "Erro de rede")
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
    throw new AIClientError(res.status, userMessage(res.status, fallback), data)
  }

  return data as TResponse
}
