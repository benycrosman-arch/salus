/**
 * Lab-PDF parser. Sends a Brazilian lab report (PDF, native text) to Claude
 * Opus 4.7 with a strict JSON schema asking for the 8 markers we already track
 * in the onboarding quiz, plus any additional markers found.
 *
 * Mirrors the lazy-singleton + defensive-JSON-parse style from
 * src/lib/whatsapp/meal-log.ts.
 */

import Anthropic from '@anthropic-ai/sdk'

export const LAB_PDF_MODEL = 'claude-opus-4-7'

let _client: Anthropic | null = null
function client(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  _client = new Anthropic({ apiKey })
  return _client
}

export type KnownLabKey =
  | 'glucose'
  | 'hba1c'
  | 'hdl'
  | 'ldl'
  | 'triglycerides'
  | 'vitaminD'
  | 'ferritin'
  | 'b12'

export interface ExtraLab {
  marker: string
  value: number
  unit: string
  reference_min: number | null
  reference_max: number | null
}

export interface PdfExtraction {
  measured_at: string | null // YYYY-MM-DD
  known: Record<KnownLabKey, number | null>
  extras: ExtraLab[]
  confidence: 'high' | 'medium' | 'low'
  notes: string
}

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

const SYSTEM_PT = `Você é um extrator de laudos laboratoriais brasileiros. Recebe um PDF de exame de sangue.
Sua tarefa é extrair valores numéricos com alta fidelidade. NÃO interprete, NÃO recomende, apenas extraia.

Mapeie estes 8 marcadores conhecidos (use null se não estiver no laudo):
- glucose: glicemia de jejum, glicose em jejum, glicose (mg/dL)
- hba1c: hemoglobina glicada, hemoglobina glicosilada, HbA1c, A1c (%)
- hdl: colesterol HDL, HDL-c, HDL (mg/dL)
- ldl: colesterol LDL, LDL-c, LDL (mg/dL); se vier "calculado" ainda use
- triglycerides: triglicerídeos, triglicérides, TG (mg/dL)
- vitaminD: vitamina D, 25-OH-D, 25-hidroxivitamina D, calcidiol (ng/mL)
- ferritin: ferritina (ng/mL)
- b12: vitamina B12, cianocobalamina (pg/mL)

Para QUALQUER OUTRO marcador presente (TSH, T4 livre, ureia, creatinina, AST/TGO, ALT/TGP, hemograma, ácido úrico, PCR, etc), inclua em "extras" com o nome em PT-BR como aparece no laudo, valor numérico, unidade exata, e os limites de referência se vierem.

Regras:
- Apenas valores numéricos. Se for qualitativo ("negativo", "presente"), pule.
- Para valores com vírgula decimal brasileira, converta para ponto (4,5 → 4.5).
- Se o mesmo marcador aparece duas vezes, use a primeira ocorrência.
- "measured_at" é a data da coleta (não da emissão do laudo). Formato YYYY-MM-DD. null se ambígua.
- "confidence": "high" se laudo padrão e legível; "medium" se layout incomum; "low" se PDF escaneado/imagem.
- "notes": 1 frase curta — "Extraídos 12 marcadores" ou "PDF parcialmente legível".

Retorne APENAS JSON, sem prosa, sem cerca de markdown:
{
  "measured_at": "YYYY-MM-DD" | null,
  "known": {
    "glucose": number | null, "hba1c": number | null, "hdl": number | null, "ldl": number | null,
    "triglycerides": number | null, "vitaminD": number | null, "ferritin": number | null, "b12": number | null
  },
  "extras": [
    { "marker": string, "value": number, "unit": string, "reference_min": number | null, "reference_max": number | null }
  ],
  "confidence": "high" | "medium" | "low",
  "notes": string
}`

function stripFencesAndIsolateJson(raw: string): string | null {
  let s = raw.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  }
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return s.slice(start, end + 1)
}

function coerceNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const cleaned = v.replace(',', '.').replace(/[^\d.\-]/g, '')
    const n = Number.parseFloat(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function normalizeExtraction(parsed: unknown): PdfExtraction | null {
  if (!parsed || typeof parsed !== 'object') return null
  const p = parsed as Record<string, unknown>

  const known = { ...EMPTY_KNOWN }
  const rawKnown = (p.known ?? {}) as Record<string, unknown>
  for (const key of Object.keys(EMPTY_KNOWN) as KnownLabKey[]) {
    known[key] = coerceNumber(rawKnown[key])
  }

  const extras: ExtraLab[] = []
  if (Array.isArray(p.extras)) {
    for (const item of p.extras) {
      if (!item || typeof item !== 'object') continue
      const it = item as Record<string, unknown>
      const marker = typeof it.marker === 'string' ? it.marker.trim() : ''
      const value = coerceNumber(it.value)
      const unit = typeof it.unit === 'string' ? it.unit.trim() : ''
      if (!marker || value === null || !unit) continue
      extras.push({
        marker,
        value,
        unit,
        reference_min: coerceNumber(it.reference_min),
        reference_max: coerceNumber(it.reference_max),
      })
    }
  }

  const measured_at =
    typeof p.measured_at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.measured_at)
      ? p.measured_at
      : null

  const confidence: PdfExtraction['confidence'] =
    p.confidence === 'high' || p.confidence === 'medium' || p.confidence === 'low'
      ? p.confidence
      : 'medium'

  const notes = typeof p.notes === 'string' ? p.notes.slice(0, 280) : ''

  return { measured_at, known, extras, confidence, notes }
}

export interface PdfExtractionResult {
  extraction: PdfExtraction
  usage: { input_tokens: number; output_tokens: number }
  raw: unknown
}

export async function extractLabsFromPdf(
  pdfBase64: string,
): Promise<PdfExtractionResult> {
  const res = await client().messages.create({
    model: LAB_PDF_MODEL,
    max_tokens: 2000,
    system: [
      {
        type: 'text',
        text: SYSTEM_PT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: 'Extraia os marcadores deste laudo seguindo o schema.',
          },
        ],
      },
    ],
  })

  const out = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')

  const isolated = stripFencesAndIsolateJson(out)
  let parsed: unknown = null
  if (isolated) {
    try {
      parsed = JSON.parse(isolated)
    } catch {
      parsed = null
    }
  }

  const extraction =
    normalizeExtraction(parsed) ??
    ({
      measured_at: null,
      known: { ...EMPTY_KNOWN },
      extras: [],
      confidence: 'low',
      notes: 'Não foi possível interpretar a resposta do modelo.',
    } as PdfExtraction)

  return {
    extraction,
    usage: {
      input_tokens: res.usage?.input_tokens ?? 0,
      output_tokens: res.usage?.output_tokens ?? 0,
    },
    raw: parsed ?? out,
  }
}
