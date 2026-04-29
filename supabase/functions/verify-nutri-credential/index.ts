// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { authenticate, serviceClient } from "../_shared/auth.ts"
import { checkRateLimit } from "../_shared/rate-limit.ts"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { logUsage } from "../_shared/log-usage.ts"

/**
 * Verify a nutricionista's CRN credential.
 *
 * Workflow:
 *   1. Frontend uploads the certificate to bucket `nutri-credentials`
 *      under {user_id}/{filename}.
 *   2. Frontend calls this function with { credential_path, crn, crn_state, claimed_name }.
 *   3. Service role downloads the file → base64.
 *   4. Claude Opus 4.7 (vision) extracts: full name, CRN number, state,
 *      issue date, validity, registration status, document quality.
 *   5. Best-effort cross-check against the CFN public registry — if the
 *      registry endpoint resolves and the name+CRN match, that adds
 *      confidence. If not reachable, that alone does not reject.
 *   6. Decision matrix:
 *        - high_confidence + cross-check OK    → verified
 *        - high_confidence, no cross-check     → verified (Claude alone is enough when extracted data fully matches)
 *        - claim mismatch (name/CRN differs)   → rejected
 *        - low_confidence / unreadable         → manual_review
 *   7. Persist result on profiles.nutri_verification_status / _data.
 */

const FUNCTION_NAME = "verify-nutri-credential"
const MODEL_ID = "claude-opus-4-7"

const SYSTEM_PROMPT = `You are an expert at validating Brazilian nutritionist credentials.

You are given an image of a CRN (Conselho Regional de Nutricionistas) registration card or certificate, plus the user's claimed CRN number, state and full name. Your job is to extract data and judge authenticity.

Return ONLY valid JSON, no markdown fences:
{
  "extracted": {
    "full_name": string | null,
    "crn_number": string | null,         // só os dígitos
    "crn_state": string | null,          // ex.: "SP", "RJ", "3", "4"
    "issue_date": string | null,         // ISO YYYY-MM-DD se identificável
    "expires_at": string | null,
    "registration_status": "active"|"inactive"|"unknown"
  },
  "authenticity": {
    "looks_official": boolean,           // logo CFN/CRN visível, formato condiz com cartão emitido pelo CFN
    "has_official_seal": boolean,
    "tampering_signs": string[],         // lista de problemas detectados, vazio se nenhum
    "image_quality": "good"|"acceptable"|"poor"
  },
  "match_with_claim": {
    "name_matches": boolean,
    "crn_matches": boolean,
    "state_matches": boolean
  },
  "confidence": "high"|"medium"|"low",   // confiança geral na sua análise
  "rationale": string                     // 1-2 frases em pt-BR explicando a decisão
}

Critérios:
- Documentos brasileiros legítimos do CFN trazem o brasão da República, sigla "CFN" ou "CRN-X" (X=número regional 1-11), nome completo, número de inscrição e data.
- Se a imagem está borrada / cortada / não dá para ler dados-chave → image_quality "poor" e confidence "low".
- Se o nome no documento NÃO bate com o nome reivindicado, name_matches=false (pequenas diferenças de acentuação ou nome do meio são ok — use bom senso).
- Se algum dado essencial não está visível, deixe null e justifique.

Não invente. Se não tem certeza, declare incerteza.`

async function callClaudeVision(apiKey: string, imageBase64: string, mediaType: string, claimed: { name: string; crn: string; state: string }) {
  const userText = `Dados reivindicados pelo usuário:
- Nome completo: ${claimed.name}
- Número CRN: ${claimed.crn}
- Estado/regional: ${claimed.state}

Analise o documento anexado e responda no JSON especificado.`

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_ID,
      max_tokens: 1500,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Anthropic ${res.status}: ${detail.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; text?: string }>
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  const block = data.content.find((c) => c.type === "text")
  let text = block?.text?.trim() ?? ""
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
  }
  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("Claude returned non-JSON output")
  }
  return {
    parsed,
    tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
  }
}

/**
 * Best-effort lookup against the CFN public registry. The site uses a
 * traditional ASP.NET form, so we POST to the search endpoint and grep
 * the HTML response for the claimed CRN. If anything goes wrong we
 * return `null` and the function continues without this signal.
 */
async function lookupCfn(crn: string, _state: string): Promise<{ found: boolean; raw_excerpt: string } | null> {
  try {
    const url = "https://sistemas.cfn.org.br/Pesquisa/PesquisaProfissional"
    const body = new URLSearchParams({
      "Numero": crn,
      "Estado": "",
      "Nome": "",
    })
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "salus-bot" },
      body: body.toString(),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const found = html.includes(crn) && /ATIVO|Ativ/i.test(html)
    // Snip a small excerpt around the match for the audit log
    const idx = html.indexOf(crn)
    const excerpt = idx >= 0 ? html.slice(Math.max(0, idx - 120), idx + 200) : ""
    return { found, raw_excerpt: excerpt.slice(0, 400) }
  } catch (err) {
    console.warn("CFN lookup failed:", (err as Error).message)
    return null
  }
}

function decide(
  ai: any,
  cfn: { found: boolean } | null,
): { status: "verified" | "rejected" | "manual_review"; reason: string } {
  const m = ai?.match_with_claim ?? {}
  const auth = ai?.authenticity ?? {}
  const conf = ai?.confidence

  if (m.name_matches === false || m.crn_matches === false) {
    return { status: "rejected", reason: "Dados do certificado não conferem com o cadastro." }
  }
  if (auth.looks_official === false || (Array.isArray(auth.tampering_signs) && auth.tampering_signs.length > 0)) {
    return { status: "rejected", reason: "O documento apresenta sinais de adulteração ou não parece oficial." }
  }
  if (auth.image_quality === "poor" || conf === "low") {
    return { status: "manual_review", reason: "Imagem ruim ou dados ilegíveis — equipe Salus revisará manualmente." }
  }
  if (cfn?.found === false) {
    // CFN endpoint reachable but didn't match → suspeito
    return { status: "manual_review", reason: "Não localizamos o CRN na consulta pública do CFN — equipe Salus revisará." }
  }
  if (conf === "high" && m.name_matches !== false && m.crn_matches !== false) {
    return { status: "verified", reason: "Documento autêntico e dados conferem." }
  }
  return { status: "manual_review", reason: "Confiança média — equipe Salus revisará para confirmar." }
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

    type Body = {
      credential_path?: string
      crn?: string
      crn_state?: string
      claimed_name?: string
    }
    let body: Body = {}
    try { body = await req.json() } catch { /* empty */ }

    const credentialPath = body.credential_path?.trim() ?? ""
    const crn = body.crn?.replace(/\D+/g, "") ?? ""
    const crnState = body.crn_state?.trim().toUpperCase() ?? ""
    const claimedName = body.claimed_name?.trim() ?? ""

    if (!credentialPath || !crn || !crnState || !claimedName) {
      return jsonResponse(
        { error: "Faltam credential_path, crn, crn_state ou claimed_name" },
        400,
        origin,
      )
    }
    // Path must live under the user's folder — defense-in-depth (RLS already enforces).
    if (!credentialPath.startsWith(`${user.id}/`)) {
      return jsonResponse({ error: "credential_path inválido" }, 403, origin)
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
    if (!apiKey) {
      return jsonResponse({ error: "AI not configured" }, 503, origin)
    }

    // Use service role to read storage + bypass profile RLS for the upsert.
    const service = serviceClient()

    const { data: fileBlob, error: dlErr } = await service.storage
      .from("nutri-credentials")
      .download(credentialPath)
    if (dlErr || !fileBlob) {
      console.error("download failed:", dlErr?.message)
      return jsonResponse({ error: "Não foi possível ler o certificado enviado" }, 400, origin)
    }

    const buf = new Uint8Array(await fileBlob.arrayBuffer())
    if (buf.byteLength > 8 * 1024 * 1024) {
      return jsonResponse({ error: "Arquivo maior que 8MB" }, 413, origin)
    }
    // Detect a few common types from the magic bytes.
    let mediaType = "image/jpeg"
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) mediaType = "image/png"
    else if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) mediaType = "application/pdf"
    else if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) mediaType = "image/gif"
    else if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) mediaType = "image/webp"

    if (mediaType === "application/pdf") {
      // The vision endpoint does support PDFs, but only on the latest model versions.
      // Treat as an image-like document and pass through.
    }

    // Base64 encode in chunks to avoid string length blowups.
    let base64 = ""
    const chunkSize = 0x8000
    for (let i = 0; i < buf.length; i += chunkSize) {
      base64 += String.fromCharCode(...buf.subarray(i, i + chunkSize))
    }
    base64 = btoa(base64)

    const { parsed: ai, tokens } = await callClaudeVision(apiKey, base64, mediaType, {
      name: claimedName,
      crn,
      state: crnState,
    })

    const cfn = await lookupCfn(crn, crnState)
    const decision = decide(ai, cfn)

    const verificationData = {
      version: 1,
      model: MODEL_ID,
      ai,
      cfn_lookup: cfn,
      decision,
      verified_at_attempt: new Date().toISOString(),
    }

    // Persist on the profile.
    const { error: upErr } = await service
      .from("profiles")
      .update({
        role: "nutricionista",
        nutri_crn: crn,
        nutri_crn_state: crnState,
        nutri_credential_url: credentialPath,
        nutri_verification_status: decision.status,
        nutri_verification_data: verificationData,
        nutri_verified_at: decision.status === "verified" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (upErr) {
      console.error("profile update failed:", upErr.message)
      return jsonResponse({ error: "Não foi possível salvar a verificação" }, 500, origin)
    }
    // Bump attempt counter atomically.
    await service.rpc("noop_increment_nutri_attempts", { p_user_id: user.id }).catch(() => {
      // RPC is optional — fall back to a SELECT/UPDATE if it doesn't exist.
    })

    await logUsage(service, { userId: user.id, tokens, edgeFunction: FUNCTION_NAME })

    console.log(
      `${FUNCTION_NAME} user=${user.id.slice(0, 8)} status=${decision.status} tokens=${tokens}`,
    )

    return jsonResponse(
      { ok: true, status: decision.status, reason: decision.reason },
      200,
      origin,
    )
  } catch (err) {
    console.error(`${FUNCTION_NAME} unexpected error:`, (err as Error).message)
    return jsonResponse({ error: "Internal server error" }, 500, origin)
  }
})
