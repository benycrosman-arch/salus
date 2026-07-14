// Lab-report parser. Sends a Brazilian lab report (PDF, native text or scanned
// images) to Claude Opus 4.8 and asks for a JSON extraction. The prompt is
// tuned for the layouts of the big Brazilian labs (Fleury, Sabin, DASA, Hermes
// Pardini, Delboni, Lavoisier, Alvaro, Bronstein) — multi-column tables,
// "Resultado | Anterior | Valores de Referência" grids, comma-decimals, units
// in the next column, footnotes that confuse linear text extraction.
//
// Two transports:
//   - PDF — sent as a `document` block (Claude renders pages internally).
//   - Images — one or many JPEG/PNG/WEBP screenshots/photos sent as `image`
//     blocks. This is the mobile path: paciente prints from a portal, screenshots
//     the lab WhatsApp, or photographs a paper laudo.
//
// Each transport has a two-pass retry: if the first call returns zero markers
// we retry with a stricter nudge prompt. Zero-marker hallucinations were the
// most common failure mode on real-world Brazilian laudos.
//
// Output is normalized into the canonical KnownLabKey set the onboarding
// quiz already uses, plus an `extras` array with everything else. The
// reference range library (see `reference-ranges.ts`) interprets these later.

import Anthropic from '@anthropic-ai/sdk'

export const LAB_PDF_MODEL = 'claude-opus-4-8'

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
  measured_at: string | null
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

const SYSTEM_PT = `Você é um extrator pericial de laudos laboratoriais brasileiros. Recebe um laudo de exame de sangue de qualquer laboratório (Fleury, Sabin, DASA, Hermes Pardini, Delboni, Alvaro, Bronstein, Lavoisier, laboratório municipal, etc.) — pode vir como PDF nativo, PDF escaneado, foto do papel, screenshot do portal ou app — e retorna JSON estruturado.

Sua única tarefa é EXTRAIR valores numéricos com altíssima fidelidade. NÃO interprete, NÃO recomende, NÃO julgue se está alterado.

═══════════════════════════════════════════════════════════════
8 MARCADORES PRINCIPAIS — sempre tente extrair se aparecerem
═══════════════════════════════════════════════════════════════

- glucose: glicemia de jejum, glicose em jejum, glicose, glicose plasmática (jejum) — em mg/dL. Se vier "glicose pós-prandial" ou "TOTG/curva glicêmica", IGNORE esses, pegue só a de jejum.
- hba1c: hemoglobina glicada, hemoglobina glicosilada, HbA1c, A1c — em %. Frequentemente reportada com sufixo "(NGSP/IFCC)" — use o valor NGSP em %, não o IFCC em mmol/mol.
- hdl: colesterol HDL, HDL-c, HDL — em mg/dL.
- ldl: colesterol LDL, LDL-c, LDL — em mg/dL. Aceite "calculado" (Friedewald) e "direto/medido". Se houver "não-HDL", NÃO confunda com LDL.
- triglycerides: triglicérides, triglicerídeos, TG — em mg/dL.
- vitaminD: 25-hidroxivitamina D, 25-OH-D, 25(OH)D, vitamina D, calcidiol — em ng/mL. Se vier em nmol/L, multiplique por 0.4 para converter (ex: 75 nmol/L → 30 ng/mL).
- ferritin: ferritina, ferritina sérica — em ng/mL (equivalente a µg/L; aceite ambos).
- b12: vitamina B12, cianocobalamina, cobalamina — em pg/mL (equivalente a ng/L; aceite ambos). Se vier em pmol/L, multiplique por 1.36.

═══════════════════════════════════════════════════════════════
EXTRAS — TODO outro marcador numérico vai em "extras"
═══════════════════════════════════════════════════════════════

Inclua tudo o que tiver valor numérico e unidade, em PT-BR. Exemplos do que esperar (não exclusivos):
- TSH (mUI/L), T4 livre (ng/dL), T3 (ng/dL), anti-TPO (UI/mL)
- Colesterol total (mg/dL), VLDL (mg/dL), Não-HDL (mg/dL)
- Ureia (mg/dL), Creatinina (mg/dL), TFG estimada (mL/min/1.73m²), Ácido úrico (mg/dL)
- TGO/AST (U/L), TGP/ALT (U/L), Gama-GT/GGT (U/L), Fosfatase alcalina (U/L), Bilirrubina total/direta/indireta (mg/dL)
- Hemograma: Hemácias (milhões/mm³), Hemoglobina (g/dL), Hematócrito (%), VCM (fL), HCM (pg), CHCM (g/dL), RDW (%), Leucócitos (/mm³), Neutrófilos (%), Linfócitos (%), Monócitos (%), Eosinófilos (%), Basófilos (%), Plaquetas (/mm³)
- Proteínas totais (g/dL), Albumina (g/dL), Globulina (g/dL)
- PCR ultrassensível (mg/L), PCR (mg/L), VHS (mm/h)
- Magnésio (mg/dL), Cálcio total (mg/dL), Cálcio iônico (mg/dL), Sódio (mEq/L), Potássio (mEq/L), Fósforo (mg/dL), Zinco (µg/dL)
- Insulina jejum (µUI/mL), HOMA-IR, Peptídeo C (ng/mL)
- Folato/ácido fólico (ng/mL)
- Ferro sérico (µg/dL), Saturação de transferrina (%), Transferrina (mg/dL), TIBC (µg/dL)

═══════════════════════════════════════════════════════════════
REGRAS DE EXTRAÇÃO — leia com atenção, são as que mais falham
═══════════════════════════════════════════════════════════════

1. DECIMAL BRASILEIRO: vírgula é separador decimal. "4,5" → 4.5. "1,200" só é mil-e-duzentos se a unidade for inteira (plaquetas, leucócitos); na dúvida, decimal.

2. MILHAR BRASILEIRO: "1.200.000" plaquetas → 1200000. Pontos com 3 dígitos depois são separadores de milhar.

3. LAYOUT DE TABELA. A maioria dos laudos vem como:
   "Marcador | Resultado | Resultado anterior | Valores de Referência | Método"
   Pegue SEMPRE o valor da coluna "Resultado" / "Atual" / a coluna mais à esquerda dos números — NÃO o anterior.

4. VALORES MARCADOS. Resultados podem vir com asteriscos (* ou **), setas (↑ ↓), ou marcas como "ALTERADO", "BAIXO", "ALTO", "H", "L". Ignore os marcadores e pegue só o número.

5. VALORES NÃO NUMÉRICOS. Se o resultado for "Não detectado", "Negativo", "Inferior a 0,05", "<5", "Indetectável" — NÃO inclua esse marcador. Exceção: se vier "<X" com sentido clínico claro (ex: PCR <0.1), use 0 e marque a unidade.

6. INTERVALOS DE REFERÊNCIA. Quando vier "70 - 99 mg/dL" coloque reference_min=70, reference_max=99. Quando vier "Inferior a 200" coloque reference_min=null, reference_max=200. Quando vier "Maior que 40" coloque reference_min=40, reference_max=null. Quando vier "Desejável < 100; Limítrofe 100-129" pegue só o "Desejável" (reference_max=100).

7. UNIDADES. SEMPRE inclua unidade exata como aparece (mg/dL, µg/L, ng/mL, mUI/L, U/L, %, /mm³, x10³/µL, fL, etc.). Se a unidade aparece numa célula vizinha, ainda assim inclua.

8. MÚLTIPLAS APARIÇÕES. Se o mesmo marcador aparece duas vezes (ex: glicose listada na sumarização e depois em detalhe), use a primeira ocorrência válida com unidade.

9. MÚLTIPLAS PÁGINAS / FOTOS. Se receber várias imagens, trate como um único laudo de várias páginas. Una os marcadores; se um marcador aparece em duas fotos com valores iguais, conte uma vez.

10. DATA DE COLETA. "measured_at" é a DATA DA COLETA (geralmente "Material recebido em" ou "Data da coleta"), NÃO a data de emissão/liberação do laudo. Formato YYYY-MM-DD. Se ambígua ou ausente, retorne null.

11. NUNCA RETORNE TUDO null. Se o documento tem QUALQUER número numa célula que pareça resultado, extraia. Se a qualidade for péssima e você só consegue ler 1-2 valores, extraia esses 1-2. Tudo-null só é aceitável se o arquivo não tem texto algum (capa, requisição em branco, página não-laudo, foto borrada demais).

═══════════════════════════════════════════════════════════════
CONFIANÇA E NOTES
═══════════════════════════════════════════════════════════════

- "confidence":
  * "high" — laudo padrão, todas as colunas legíveis, extraiu ≥ 80% do que enxergou.
  * "medium" — layout incomum, algumas células ambíguas, ou laudo parcial.
  * "low" — PDF/foto de baixa qualidade, manuscrito, ou só 1-3 marcadores legíveis.

- "notes": UMA frase curta em PT-BR descrevendo o que aconteceu. Exemplos:
  * "Laudo Fleury padrão; extraídos 14 marcadores."
  * "Foto do laudo, qualidade média; extraídos 6 marcadores principais."
  * "Páginas 1-2 são requisição; resultados estão a partir da página 3."

═══════════════════════════════════════════════════════════════
FORMATO DE SAÍDA — JSON puro, SEM cerca de markdown, SEM prosa
═══════════════════════════════════════════════════════════════

{
  "measured_at": "YYYY-MM-DD" ou null,
  "known": {
    "glucose": número ou null,
    "hba1c": número ou null,
    "hdl": número ou null,
    "ldl": número ou null,
    "triglycerides": número ou null,
    "vitaminD": número ou null,
    "ferritin": número ou null,
    "b12": número ou null
  },
  "extras": [
    { "marker": "Nome em PT-BR", "value": número, "unit": "unidade", "reference_min": número ou null, "reference_max": número ou null }
  ],
  "confidence": "high" | "medium" | "low",
  "notes": "1 frase curta"
}`

const RETRY_NUDGE = `O laudo enviado tem texto/imagens — extraia AGORA, mesmo que parcialmente. Olhe TODAS as páginas/fotos. Se vir QUALQUER tabela com colunas tipo "Resultado | Referência", extraia cada linha. Não retorne tudo null — se o documento realmente não tiver nenhum dado de exame, devolva confidence "low" e explique nas notes. Se conseguir ler PELO MENOS um marcador, retorne ele.`

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
  if (typeof v !== 'string') return null

  let s = v.replace(/[^\d.,\-]/g, '')
  if (!s) return null

  const hasComma = s.includes(',')
  const hasDot = s.includes('.')

  if (hasComma) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (hasDot) {
    const dots = s.match(/\./g)?.length ?? 0
    if (dots > 1) {
      s = s.replace(/\./g, '')
    } else {
      const tail = s.split('.')[1] ?? ''
      const head = s.split('.')[0] ?? ''
      if (tail.length === 3 && head.length >= 1 && /^\d+$/.test(head) && Number(head) >= 100) {
        s = s.replace('.', '')
      }
    }
  }

  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : null
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

function countMarkers(extraction: PdfExtraction): number {
  return (
    Object.values(extraction.known).filter((v) => v !== null).length +
    extraction.extras.length
  )
}

export interface PdfExtractionResult {
  extraction: PdfExtraction
  usage: { input_tokens: number; output_tokens: number }
  raw: unknown
  attempts: number
}

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export interface InputImage {
  mediaType: ImageMediaType
  base64: string
}

type UserContent = Anthropic.Messages.MessageParam['content']

function buildPdfContent(pdfBase64: string, instruction: string): UserContent {
  return [
    {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pdfBase64,
      },
    },
    { type: 'text', text: instruction },
  ]
}

function buildImagesContent(images: InputImage[], instruction: string): UserContent {
  const blocks: UserContent = images.map((img) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: img.mediaType,
      data: img.base64,
    },
  }))
  blocks.push({ type: 'text', text: instruction })
  return blocks
}

async function callExtractor(
  content: UserContent,
): Promise<{ text: string; usage: Anthropic.Messages.Usage }> {
  const res = await client().messages.create({
    model: LAB_PDF_MODEL,
    max_tokens: 6000,
    system: [
      {
        type: 'text',
        text: SYSTEM_PT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content }],
  })
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
  return { text, usage: res.usage }
}

function parseExtractorOutput(text: string): { extraction: PdfExtraction | null; raw: unknown } {
  const isolated = stripFencesAndIsolateJson(text)
  if (!isolated) return { extraction: null, raw: text }
  let parsed: unknown = null
  try {
    parsed = JSON.parse(isolated)
  } catch {
    return { extraction: null, raw: text }
  }
  return { extraction: normalizeExtraction(parsed), raw: parsed }
}

async function runTwoPass(
  buildFirst: (instruction: string) => UserContent,
  buildSecond: (instruction: string) => UserContent,
): Promise<PdfExtractionResult> {
  let totalInput = 0
  let totalOutput = 0
  let attempts = 0
  let lastRaw: unknown = null

  attempts++
  const first = await callExtractor(
    buildFirst('Extraia TODOS os marcadores deste laudo seguindo o schema. Retorne JSON puro, sem cerca de markdown.'),
  )
  totalInput += first.usage.input_tokens ?? 0
  totalOutput += first.usage.output_tokens ?? 0
  const firstParsed = parseExtractorOutput(first.text)
  lastRaw = firstParsed.raw

  if (firstParsed.extraction && countMarkers(firstParsed.extraction) > 0) {
    return {
      extraction: firstParsed.extraction,
      usage: { input_tokens: totalInput, output_tokens: totalOutput },
      raw: lastRaw,
      attempts,
    }
  }

  attempts++
  const second = await callExtractor(buildSecond(RETRY_NUDGE))
  totalInput += second.usage.input_tokens ?? 0
  totalOutput += second.usage.output_tokens ?? 0
  const secondParsed = parseExtractorOutput(second.text)
  lastRaw = secondParsed.raw ?? lastRaw

  const extraction =
    secondParsed.extraction ??
    firstParsed.extraction ??
    ({
      measured_at: null,
      known: { ...EMPTY_KNOWN },
      extras: [],
      confidence: 'low',
      notes: 'Não foi possível interpretar o documento. Tente outro arquivo ou preencha manualmente.',
    } as PdfExtraction)

  return {
    extraction,
    usage: { input_tokens: totalInput, output_tokens: totalOutput },
    raw: lastRaw ?? first.text,
    attempts,
  }
}

export async function extractLabsFromPdf(pdfBase64: string): Promise<PdfExtractionResult> {
  return runTwoPass(
    (instruction) => buildPdfContent(pdfBase64, instruction),
    (instruction) => buildPdfContent(pdfBase64, instruction),
  )
}

export async function extractLabsFromImages(
  images: InputImage[],
): Promise<PdfExtractionResult> {
  if (images.length === 0) throw new Error('No images supplied to extractLabsFromImages')
  return runTwoPass(
    (instruction) => buildImagesContent(images, instruction),
    (instruction) => buildImagesContent(images, instruction),
  )
}
