// deno-lint-ignore-file no-explicit-any
// Lab-report parser running on Supabase Edge (Deno). Replaces the Vercel
// /api/labs/parse-pdf route that was hitting the 60s Hobby-plan cap on
// multi-page Brazilian laudos.
//
// Single endpoint, two callers:
//   - paciente uploading their own exam → target = caller.id
//   - nutricionista uploading a linked paciente's exam → target = patientId,
//     active link required; lab_uploads + lab_results written with service role
//
// Input contract (JSON body):
//   {
//     patientId?: string,    // when set, caller must be linked nutricionista
//     mode: "pdf" | "images",
//     files: [{ name, mediaType, size, base64 }]
//   }
//
// On Anthropic failure we keep the lab_uploads row (so the file is preserved)
// and return `{ uploadId, code, fallback: "manual" }` so the UI shows the
// manual-entry path instead of dead-ending the user.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { authenticate, serviceClient } from "../_shared/auth.ts"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import {
  callAnthropic,
  extractText,
  AnthropicError,
  MODEL_OPUS,
  MODEL_ID,
} from "../_shared/anthropic.ts"
import { anthropicErrorResponse } from "../_shared/anthropic-error.ts"
import { interpretLabs, type RawMarker } from "../_shared/lab-interpret.ts"
import type { Sex } from "../_shared/lab-ranges.ts"

const FUNCTION_NAME = "ai-extract-labs"

const MAX_PDF_BYTES = 10 * 1024 * 1024
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_TOTAL_BYTES = 24 * 1024 * 1024
const MAX_IMAGES = 8
const MAX_PAGES = 35

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif"
const ALLOWED_IMAGE_TYPES = new Set<ImageMediaType>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

type KnownLabKey =
  | "glucose"
  | "hba1c"
  | "hdl"
  | "ldl"
  | "triglycerides"
  | "vitaminD"
  | "ferritin"
  | "b12"

const EMPTY_KNOWN: Record<KnownLabKey, number | null> = {
  glucose: null,
  hba1c: null,
  hdl: null,
  ldl: null,
  triglycerides: null,
  vitaminD: null,
  ferritin: null,
  b12: null,
}

const KNOWN_LABELS: Record<KnownLabKey, string> = {
  glucose: "Glicose em jejum",
  hba1c: "Hemoglobina glicada (HbA1c)",
  hdl: "HDL",
  ldl: "LDL",
  triglycerides: "Triglicérides",
  vitaminD: "Vitamina D (25-OH)",
  ferritin: "Ferritina",
  b12: "Vitamina B12",
}
const KNOWN_UNITS: Record<KnownLabKey, string> = {
  glucose: "mg/dL",
  hba1c: "%",
  hdl: "mg/dL",
  ldl: "mg/dL",
  triglycerides: "mg/dL",
  vitaminD: "ng/mL",
  ferritin: "ng/mL",
  b12: "pg/mL",
}

const SYSTEM_PT = `Você é um extrator pericial de laudos laboratoriais brasileiros. Recebe um laudo de exame de sangue de qualquer laboratório (Fleury, Sabin, DASA, Hermes Pardini, Delboni, Alvaro, Bronstein, Lavoisier, laboratório municipal, etc.) — pode vir como PDF nativo, PDF escaneado, foto do papel, screenshot do portal ou app — e retorna JSON estruturado.

Sua única tarefa é EXTRAIR valores numéricos com altíssima fidelidade. NÃO interprete, NÃO recomende, NÃO julgue se está alterado.

═══════════════════════════════════════════════════════════════
8 MARCADORES PRINCIPAIS — sempre tente extrair se aparecerem
═══════════════════════════════════════════════════════════════

- glucose: glicemia de jejum, glicose em jejum, glicose, glicose plasmática (jejum) — em mg/dL. Se vier "glicose pós-prandial" ou "TOTG/curva glicêmica", IGNORE esses, pegue só a de jejum.
- hba1c: hemoglobina glicada, hemoglobina glicosilada, HbA1c, A1c — em %.
- hdl: colesterol HDL, HDL-c, HDL — em mg/dL.
- ldl: colesterol LDL, LDL-c, LDL — em mg/dL. Aceite "calculado" e "direto".
- triglycerides: triglicérides, triglicerídeos, TG — em mg/dL.
- vitaminD: 25-hidroxivitamina D, 25-OH-D, 25(OH)D, vitamina D, calcidiol — em ng/mL. Se vier em nmol/L, multiplique por 0.4.
- ferritin: ferritina, ferritina sérica — em ng/mL.
- b12: vitamina B12, cianocobalamina, cobalamina — em pg/mL. Se vier em pmol/L, multiplique por 1.36.

═══════════════════════════════════════════════════════════════
EXTRAS — TODO outro marcador numérico vai em "extras"
═══════════════════════════════════════════════════════════════

Inclua tudo com valor numérico e unidade, em PT-BR (TSH, T4 livre, colesterol total, ureia, creatinina, TGO, TGP, GGT, hemograma completo, PCR, magnésio, sódio, potássio, ferro sérico, transferrina, ácido fólico, insulina jejum, HOMA-IR, etc).

═══════════════════════════════════════════════════════════════
REGRAS DE EXTRAÇÃO
═══════════════════════════════════════════════════════════════

1. DECIMAL BR: vírgula é decimal ("4,5" → 4.5).
2. MILHAR BR: "1.200.000" → 1200000.
3. TABELA: pegue a coluna "Resultado"/"Atual", NÃO o anterior.
4. MARCADORES: ignore *, ↑, ↓, "ALTERADO", "H", "L" e pegue só o número.
5. NÃO NUMÉRICO: pule "Negativo", "Indetectável" (exceto "<X" com sentido clínico claro).
6. REFERÊNCIA: "70-99" → min=70, max=99. "Inferior a 200" → max=200, min=null. "Maior que 40" → min=40, max=null.
7. UNIDADE: sempre incluir.
8. MÚLTIPLAS APARIÇÕES: use a primeira ocorrência válida.
9. MULTI-PÁGINA: imagens diferentes do mesmo laudo → unir; valor igual em duas → contar uma vez.
10. DATA DE COLETA: "Material recebido em" / "Data da coleta". YYYY-MM-DD. null se ambígua.
11. NUNCA TUDO null: se há QUALQUER número que pareça resultado, extraia. Tudo-null só se realmente não há laudo (capa, requisição em branco, foto borrada demais).

═══════════════════════════════════════════════════════════════
FORMATO — JSON puro, sem cerca de markdown, sem prosa
═══════════════════════════════════════════════════════════════

{
  "measured_at": "YYYY-MM-DD" | null,
  "known": { "glucose": número|null, "hba1c": número|null, "hdl": número|null, "ldl": número|null, "triglycerides": número|null, "vitaminD": número|null, "ferritin": número|null, "b12": número|null },
  "extras": [{ "marker": "Nome PT-BR", "value": número, "unit": "unidade", "reference_min": número|null, "reference_max": número|null }],
  "confidence": "high" | "medium" | "low",
  "notes": "1 frase curta"
}`

const RETRY_NUDGE = `O laudo enviado tem texto/imagens — extraia AGORA, mesmo que parcialmente. Olhe TODAS as páginas/fotos. Se vir QUALQUER tabela tipo "Resultado | Referência", extraia cada linha. Não retorne tudo null. Se conseguir ler PELO MENOS um marcador, retorne ele.`

interface InputFile {
  name: string
  mediaType: string
  size: number
  base64: string
}

interface RequestBody {
  patientId?: string
  mode?: "pdf" | "images"
  files?: InputFile[]
}

function stripFences(s: string): string | null {
  const start = s.indexOf("{")
  const end = s.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null
  return s.slice(start, end + 1)
}

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v !== "string") return null
  let s = v.replace(/[^\d.,\-]/g, "")
  if (!s) return null
  const hasComma = s.includes(",")
  const hasDot = s.includes(".")
  if (hasComma) {
    s = s.replace(/\./g, "").replace(",", ".")
  } else if (hasDot) {
    const dots = s.match(/\./g)?.length ?? 0
    if (dots > 1) s = s.replace(/\./g, "")
    else {
      const tail = s.split(".")[1] ?? ""
      const head = s.split(".")[0] ?? ""
      if (tail.length === 3 && /^\d+$/.test(head) && Number(head) >= 100) {
        s = s.replace(".", "")
      }
    }
  }
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : null
}

interface NormalizedExtraction {
  measured_at: string | null
  known: Record<KnownLabKey, number | null>
  extras: Array<{
    marker: string
    value: number
    unit: string
    reference_min: number | null
    reference_max: number | null
  }>
  confidence: "high" | "medium" | "low"
  notes: string
}

function normalize(parsed: unknown): NormalizedExtraction | null {
  if (!parsed || typeof parsed !== "object") return null
  const p = parsed as Record<string, unknown>
  const known = { ...EMPTY_KNOWN }
  const rawKnown = (p.known ?? {}) as Record<string, unknown>
  for (const key of Object.keys(EMPTY_KNOWN) as KnownLabKey[]) {
    known[key] = coerceNumber(rawKnown[key])
  }
  const extras: NormalizedExtraction["extras"] = []
  if (Array.isArray(p.extras)) {
    for (const it of p.extras) {
      if (!it || typeof it !== "object") continue
      const item = it as Record<string, unknown>
      const marker = typeof item.marker === "string" ? item.marker.trim() : ""
      const value = coerceNumber(item.value)
      const unit = typeof item.unit === "string" ? item.unit.trim() : ""
      if (!marker || value === null || !unit) continue
      extras.push({
        marker,
        value,
        unit,
        reference_min: coerceNumber(item.reference_min),
        reference_max: coerceNumber(item.reference_max),
      })
    }
  }
  const measured_at =
    typeof p.measured_at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.measured_at)
      ? p.measured_at
      : null
  const confidence =
    p.confidence === "high" || p.confidence === "medium" || p.confidence === "low"
      ? (p.confidence as "high" | "medium" | "low")
      : "medium"
  const notes = typeof p.notes === "string" ? p.notes.slice(0, 280) : ""
  return { measured_at, known, extras, confidence, notes }
}

function countMarkers(e: NormalizedExtraction): number {
  return Object.values(e.known).filter((v) => v !== null).length + e.extras.length
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function countPdfPages(bytes: Uint8Array): number {
  const decoder = new TextDecoder("latin1")
  const text = decoder.decode(bytes)
  const matches = text.match(/\/Type\s*\/Page(?![s])/g)
  return matches ? matches.length : 1
}

function extensionFor(mediaType: string): string {
  switch (mediaType) {
    case "image/jpeg": return "jpg"
    case "image/png": return "png"
    case "image/webp": return "webp"
    case "image/gif": return "gif"
    case "application/pdf": return "pdf"
    default: return "bin"
  }
}

function profileSex(raw: string | null | undefined): Sex {
  if (raw === "male") return "M"
  if (raw === "female") return "F"
  return "any"
}

async function callExtractor(
  content: any[],
): Promise<{ extraction: NormalizedExtraction | null; raw: unknown }> {
  const res = await callAnthropic({
    model: MODEL_OPUS,
    fallbackModel: MODEL_ID,
    maxTokens: 6000,
    system: [{ type: "text", text: SYSTEM_PT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  })
  const text = extractText(res)
  const isolated = stripFences(text)
  if (!isolated) return { extraction: null, raw: text }
  try {
    const parsed = JSON.parse(isolated)
    return { extraction: normalize(parsed), raw: parsed }
  } catch {
    return { extraction: null, raw: text }
  }
}

serve(async (req) => {
  const origin = req.headers.get("Origin")

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin)
  }

  const auth = await authenticate(req)
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status, origin)
  const { user } = auth
  const service = serviceClient()

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400, origin)
  }

  const mode = body.mode === "images" ? "images" : "pdf"
  const files = Array.isArray(body.files) ? body.files : []
  if (files.length === 0) {
    return jsonResponse({ error: "Arquivo ausente.", code: "no_files" }, 400, origin)
  }

  // Decide target user (paciente self vs nutri-on-behalf-of-patient).
  let targetUserId = user.id
  let nutriMode = false
  if (body.patientId && body.patientId !== user.id) {
    const { data: profile } = await service
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    if (profile?.role !== "nutricionista") {
      return jsonResponse(
        { error: "Apenas nutricionistas podem enviar exame de outro usuário.", code: "forbidden" },
        403,
        origin,
      )
    }
    const { data: link } = await service
      .from("nutri_patient_links")
      .select("status")
      .eq("nutri_id", user.id)
      .eq("patient_id", body.patientId)
      .eq("status", "active")
      .maybeSingle()
    if (!link) {
      return jsonResponse(
        { error: "Paciente não vinculado a você.", code: "no_link" },
        403,
        origin,
      )
    }
    targetUserId = body.patientId
    nutriMode = true
  }

  // Validate files.
  const pdfFiles = files.filter((f) => f.mediaType === "application/pdf")
  const imageFiles = files.filter((f) => ALLOWED_IMAGE_TYPES.has(f.mediaType as ImageMediaType))
  const unknownFiles = files.filter(
    (f) => f.mediaType !== "application/pdf" && !ALLOWED_IMAGE_TYPES.has(f.mediaType as ImageMediaType),
  )

  if (unknownFiles.length > 0) {
    return jsonResponse(
      { error: "Aceitamos PDF ou fotos JPEG/PNG/WebP.", code: "bad_type" },
      400,
      origin,
    )
  }
  if (mode === "pdf" && pdfFiles.length !== 1) {
    return jsonResponse(
      { error: "Em modo PDF envie exatamente 1 arquivo.", code: "bad_count" },
      400,
      origin,
    )
  }
  if (mode === "images" && imageFiles.length === 0) {
    return jsonResponse(
      { error: "Em modo imagens envie ao menos 1 foto.", code: "bad_count" },
      400,
      origin,
    )
  }
  if (imageFiles.length > MAX_IMAGES) {
    return jsonResponse(
      { error: `Máximo de ${MAX_IMAGES} fotos por envio.`, code: "too_many_images" },
      400,
      origin,
    )
  }

  let totalBytes = 0
  for (const f of files) {
    if (!f.base64 || f.base64.length === 0) {
      return jsonResponse({ error: "Arquivo vazio.", code: "empty_file" }, 400, origin)
    }
    totalBytes += f.size ?? 0
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return jsonResponse(
      { error: `Tamanho total acima de ${MAX_TOTAL_BYTES / 1024 / 1024} MB.`, code: "too_large" },
      400,
      origin,
    )
  }
  if (mode === "pdf" && pdfFiles[0].size > MAX_PDF_BYTES) {
    return jsonResponse(
      { error: `PDF acima de ${MAX_PDF_BYTES / 1024 / 1024} MB.`, code: "too_large" },
      400,
      origin,
    )
  }
  for (const img of imageFiles) {
    if (img.size > MAX_IMAGE_BYTES) {
      return jsonResponse(
        { error: `Foto "${img.name}" acima de ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`, code: "too_large" },
        400,
        origin,
      )
    }
  }

  const pdfBytes = mode === "pdf" ? base64ToBytes(pdfFiles[0].base64) : null
  const pageCount = pdfBytes ? countPdfPages(pdfBytes) : imageFiles.length
  if (pdfBytes && pageCount > MAX_PAGES) {
    return jsonResponse(
      { error: `O PDF tem ${pageCount} páginas; limite ${MAX_PAGES}.`, code: "too_many_pages" },
      400,
      origin,
    )
  }

  const { data: targetProfile } = await service
    .from("profiles")
    .select("biological_sex, age")
    .eq("id", targetUserId)
    .maybeSingle()
  const sex = profileSex(targetProfile?.biological_sex)
  const age = typeof targetProfile?.age === "number" ? targetProfile.age : 30

  const primaryName = mode === "pdf"
    ? (pdfFiles[0].name?.slice(0, 255) || "exame.pdf")
    : (imageFiles[0]?.name?.slice(0, 255) || `exame-${imageFiles.length}-fotos`)

  const { data: uploadRow, error: insertError } = await service
    .from("lab_uploads")
    .insert({
      user_id: targetUserId,
      storage_path: "",
      original_filename: primaryName,
      byte_size: totalBytes,
      page_count: pageCount,
      model: MODEL_OPUS,
    })
    .select("id")
    .single()

  if (insertError || !uploadRow) {
    console.error(`${FUNCTION_NAME} lab_uploads insert failed`, insertError)
    return jsonResponse(
      { error: "Não foi possível registrar o upload.", code: "db_insert" },
      500,
      origin,
    )
  }

  const uploadId = uploadRow.id as string
  const storagePathPrimary = mode === "pdf"
    ? `${targetUserId}/${uploadId}.pdf`
    : `${targetUserId}/${uploadId}-1.${extensionFor(imageFiles[0].mediaType)}`

  // Upload to storage with service role (works for both paciente-self and
  // nutri-on-behalf-of, since RLS would block the cross-user case).
  if (mode === "pdf" && pdfBytes) {
    const { error } = await service.storage
      .from("lab-pdfs")
      .upload(storagePathPrimary, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      })
    if (error) {
      console.error(`${FUNCTION_NAME} storage upload (pdf) failed`, error)
      await service.from("lab_uploads").delete().eq("id", uploadId)
      return jsonResponse({ error: "Falha ao salvar o PDF.", code: "storage" }, 500, origin)
    }
  } else {
    let firstErr: { message: string } | null = null
    for (let i = 0; i < imageFiles.length; i++) {
      const f = imageFiles[i]
      const bytes = base64ToBytes(f.base64)
      const ext = extensionFor(f.mediaType)
      const path = `${targetUserId}/${uploadId}-${i + 1}.${ext}`
      const { error } = await service.storage
        .from("lab-pdfs")
        .upload(path, bytes, { contentType: f.mediaType, upsert: false })
      if (error) { firstErr = error; break }
    }
    if (firstErr) {
      console.error(`${FUNCTION_NAME} storage upload (images) failed`, firstErr)
      await service.from("lab_uploads").delete().eq("id", uploadId)
      return jsonResponse({ error: "Falha ao salvar as fotos.", code: "storage" }, 500, origin)
    }
  }

  await service
    .from("lab_uploads")
    .update({ storage_path: storagePathPrimary })
    .eq("id", uploadId)

  // ── Anthropic extraction (with built-in retry + model fallback)
  const buildContent = (instruction: string): any[] => {
    if (mode === "pdf" && pdfBytes) {
      return [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: pdfFiles[0].base64,
          },
        },
        { type: "text", text: instruction },
      ]
    }
    const blocks: any[] = imageFiles.map((f) => ({
      type: "image",
      source: { type: "base64", media_type: f.mediaType, data: f.base64 },
    }))
    blocks.push({ type: "text", text: instruction })
    return blocks
  }

  let extraction: NormalizedExtraction | null = null
  let rawExtraction: unknown = null
  let anthropicErr: AnthropicError | null = null

  try {
    const pass1 = await callExtractor(
      buildContent("Extraia TODOS os marcadores deste laudo seguindo o schema. JSON puro, sem markdown."),
    )
    rawExtraction = pass1.raw
    if (pass1.extraction && countMarkers(pass1.extraction) > 0) {
      extraction = pass1.extraction
    } else {
      // Pass 2 — strict nudge
      const pass2 = await callExtractor(buildContent(RETRY_NUDGE))
      rawExtraction = pass2.raw ?? rawExtraction
      extraction = pass2.extraction ?? pass1.extraction
    }
  } catch (err) {
    if (err instanceof AnthropicError) anthropicErr = err
    else {
      console.error(`${FUNCTION_NAME} unexpected error`, err)
      anthropicErr = new AnthropicError({
        code: "anthropic_unknown",
        upstreamStatus: 0,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // ── Anthropic-failed branch: KEEP the upload row, mark as not-parsed, and
  // return the manual-fallback envelope so the UI keeps the user in flow.
  if (anthropicErr) {
    await service
      .from("lab_uploads")
      .update({
        parsed_at: null,
        markers_extracted: 0,
        raw_extraction: {
          error: anthropicErr.code,
          upstream_status: anthropicErr.upstreamStatus,
          message: anthropicErr.message.slice(0, 500),
        } as unknown as object,
      })
      .eq("id", uploadId)

    console.error(
      `${FUNCTION_NAME} extraction_failed code=${anthropicErr.code} upstream=${anthropicErr.upstreamStatus} upload=${uploadId} target=${targetUserId}`,
    )
    // 200 with fallback envelope — Phase 4: never dead-end the user.
    return jsonResponse(
      {
        uploadId,
        fallback: "manual",
        code: anthropicErr.code,
        upstream_status: anthropicErr.upstreamStatus,
        error: friendlyMessage(anthropicErr.code),
        measuredAt: null,
        knownLabs: { ...EMPTY_KNOWN },
        extraLabs: [],
        confidence: "low",
        notes: "Não consegui interpretar automaticamente — preencha os valores abaixo a partir do laudo.",
        interpretation: { markers: [], flags: [], rollup: { optimal: 0, borderline: 0, out_of_range: 0, critical: 0, total: 0 } },
        savedCount: 0,
      },
      200,
      origin,
    )
  }

  // ── Empty extraction branch: API succeeded but model returned nothing
  if (!extraction || countMarkers(extraction) === 0) {
    await service
      .from("lab_uploads")
      .update({
        parsed_at: new Date().toISOString(),
        markers_extracted: 0,
        raw_extraction: (rawExtraction as object) ?? null,
      })
      .eq("id", uploadId)
    return jsonResponse(
      {
        uploadId,
        fallback: "manual",
        code: "empty_extraction",
        error: "Não consegui ler nenhum marcador. Preencha abaixo a partir do laudo.",
        measuredAt: null,
        knownLabs: { ...EMPTY_KNOWN },
        extraLabs: [],
        confidence: "low",
        notes: "PDF ou foto sem marcadores legíveis.",
        interpretation: { markers: [], flags: [], rollup: { optimal: 0, borderline: 0, out_of_range: 0, critical: 0, total: 0 } },
        savedCount: 0,
      },
      200,
      origin,
    )
  }

  // ── Success branch
  const rawMarkers: RawMarker[] = []
  for (const [key, value] of Object.entries(extraction.known)) {
    if (value === null) continue
    rawMarkers.push({
      marker: KNOWN_LABELS[key as KnownLabKey] ?? key,
      value,
      unit: KNOWN_UNITS[key as KnownLabKey] ?? "",
    })
  }
  for (const x of extraction.extras) {
    rawMarkers.push({
      marker: x.marker,
      value: x.value,
      unit: x.unit,
      reference_min: x.reference_min,
      reference_max: x.reference_max,
    })
  }
  const interpreted = interpretLabs(rawMarkers, sex, age)

  const today = new Date().toISOString().slice(0, 10)
  const measuredAt =
    extraction.measured_at && /^\d{4}-\d{2}-\d{2}$/.test(extraction.measured_at)
      ? extraction.measured_at
      : today

  // Auto-save lab_results only for nutri-mode (nutri is the source of truth
  // for the upload). Paciente flow lets the user review/edit before saving.
  let savedCount = 0
  if (nutriMode) {
    const rows: any[] = []
    for (const [key, value] of Object.entries(extraction.known)) {
      if (value === null) continue
      rows.push({
        user_id: targetUserId,
        marker: KNOWN_LABELS[key as KnownLabKey] ?? key,
        value,
        unit: KNOWN_UNITS[key as KnownLabKey] ?? "",
        measured_at: measuredAt,
        source: "pdf_upload",
        upload_id: uploadId,
      })
    }
    for (const x of extraction.extras) {
      rows.push({
        user_id: targetUserId,
        marker: x.marker,
        value: x.value,
        unit: x.unit,
        reference_min: x.reference_min,
        reference_max: x.reference_max,
        measured_at: measuredAt,
        source: "pdf_upload",
        upload_id: uploadId,
      })
    }
    if (rows.length > 0) {
      const { error: rowsError } = await service.from("lab_results").insert(rows)
      if (rowsError) {
        console.error(`${FUNCTION_NAME} lab_results insert failed`, rowsError)
      } else {
        savedCount = rows.length
      }
    }
  }

  const knownCount = Object.values(extraction.known).filter((v) => v !== null).length
  const markersExtracted = knownCount + extraction.extras.length

  await service
    .from("lab_uploads")
    .update({
      parsed_at: new Date().toISOString(),
      markers_extracted: markersExtracted,
      raw_extraction: (rawExtraction as object) ?? null,
    })
    .eq("id", uploadId)

  return jsonResponse(
    {
      uploadId,
      measuredAt: extraction.measured_at,
      knownLabs: extraction.known,
      extraLabs: extraction.extras,
      confidence: extraction.confidence,
      notes: extraction.notes,
      interpretation: {
        markers: interpreted.markers,
        flags: interpreted.flags,
        rollup: interpreted.rollup,
      },
      savedCount,
    },
    200,
    origin,
  )
})

function friendlyMessage(code: string): string {
  switch (code) {
    case "anthropic_overloaded": return "IA sobrecarregada agora. O arquivo está salvo — preencha manual ou tente em 30s."
    case "anthropic_rate_limit": return "Muitas requisições. O arquivo está salvo — preencha manual ou tente em 30s."
    case "anthropic_network": return "A IA demorou demais. O arquivo está salvo — preencha manual ou tente outro PDF."
    case "anthropic_billing": return "Saldo de IA acabou (admin precisa adicionar créditos no Anthropic). O arquivo está salvo — preencha manual abaixo."
    case "anthropic_invalid_request": return "A IA não conseguiu processar esse formato. O arquivo está salvo — preencha manual."
    case "anthropic_auth":
    case "api_key_missing": return "IA temporariamente desconfigurada. O arquivo está salvo — preencha manual ou avise o suporte."
    default: return "Não consegui interpretar o exame agora. O arquivo está salvo — preencha manual abaixo."
  }
}
