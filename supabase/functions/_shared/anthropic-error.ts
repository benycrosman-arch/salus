// Central translator: AnthropicError → JSON response with a PT-BR string and
// machine-readable `code`. Always logs at error level so Supabase function
// logs show the *real* upstream cause (not the generic "AI service error"
// that pacientes used to see).

import { jsonResponse } from "./cors.ts"
import { AnthropicError } from "./anthropic.ts"

const USER_MESSAGES_PT: Record<string, string> = {
  api_key_missing: "IA não configurada no servidor. Avise o suporte.",
  anthropic_auth: "Credenciais de IA inválidas. Avise o suporte.",
  anthropic_model_not_found: "Modelo de IA indisponível. Estamos investigando.",
  anthropic_rate_limit: "Muitas requisições no momento. Aguarde alguns segundos e tente de novo.",
  anthropic_overloaded: "IA sobrecarregada. Tente novamente em alguns segundos.",
  anthropic_billing: "Saldo de IA acabou. Avise o suporte (admin precisa adicionar créditos).",
  anthropic_invalid_request: "Não consegui processar essa imagem. Tente outra foto com mais luz e foco.",
  anthropic_5xx: "IA com problema temporário. Tente de novo em instantes.",
  anthropic_network: "Falha de rede ao falar com a IA. Tente de novo.",
  anthropic_unknown: "IA com problema temporário. Tente de novo em instantes.",
}

export function anthropicErrorResponse(
  err: AnthropicError,
  origin: string | null,
  functionName: string,
): Response {
  const userMessage = USER_MESSAGES_PT[err.code] ?? USER_MESSAGES_PT.anthropic_unknown
  console.error(
    `${functionName} anthropic_error code=${err.code} upstream=${err.upstreamStatus} status=${err.status} message=${err.message}`,
  )
  return jsonResponse(
    {
      error: userMessage,
      code: err.code,
      upstream_status: err.upstreamStatus,
    },
    err.status,
    origin,
  )
}
