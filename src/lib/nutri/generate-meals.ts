import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NUTRI_MEAL_OPTIONS_PROMPT, PATIENT_MEAL_SWAP_PROMPT } from '@/lib/prompts'

export const MEAL_GEN_MODEL = 'claude-sonnet-4-6'

let _client: Anthropic | null = null
function client(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  _client = new Anthropic({ apiKey })
  return _client
}

export const MEAL_TYPES = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner'] as const
export type MealType = (typeof MEAL_TYPES)[number]

export const MEAL_TYPE_LABEL_PT: Record<MealType, string> = {
  breakfast: 'Café da manhã',
  snack1: 'Lanche da manhã',
  lunch: 'Almoço',
  snack2: 'Lanche da tarde',
  dinner: 'Jantar',
}

export interface MealMacros {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

export interface GeneratedMealOption {
  meal_type: MealType
  title: string
  description: string
  macros: MealMacros
  rationale: string
}

export interface PatientContext {
  name?: string | null
  biological_sex?: string | null
  birth_date?: string | null
  height_cm?: number | null
  weight_kg?: number | null
  goals?: {
    calories_target?: number | null
    protein_g?: number | null
    carbs_g?: number | null
    fat_g?: number | null
    notes?: string | null
  } | null
  activeRecommendation?: string | null
  attachments?: string[] // extracted_text snippets
  labs?: Array<{
    marker: string
    value: number
    unit: string | null
    reference_min: number | null
    reference_max: number | null
  }>
  // Recent meals to derive "coisas a melhorar"
  meals?: Array<{
    meal_type: string | null
    score: number | null
    score_band: string | null
    foods?: string[]
  }>
}

/**
 * Pull everything the meal AI needs about a paciente in one shot. Works for
 * both surfaces: the nutri reaches the rows via the active-link RLS policies,
 * the paciente via the "own data" policies. Anything blocked by RLS simply
 * comes back empty, which the prompt handles gracefully.
 */
export async function loadPatientContext(
  supabase: SupabaseClient,
  patientId: string,
): Promise<PatientContext> {
  const since30Iso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [profileRes, goalsRes, recRes, attRes, labsRes, mealsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, biological_sex, birth_date, height_cm, weight_kg')
      .eq('id', patientId)
      .maybeSingle(),
    supabase
      .from('patient_goals')
      .select('calories_target, protein_g, carbs_g, fat_g, notes, updated_at')
      .eq('patient_id', patientId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('nutri_recommendations')
      .select('body')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('nutri_patient_attachments')
      .select('extracted_text')
      .eq('patient_id', patientId)
      .not('extracted_text', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('lab_results')
      .select('marker, value, unit, reference_min, reference_max, measured_at')
      .eq('user_id', patientId)
      .order('measured_at', { ascending: false })
      .limit(20),
    supabase
      .from('meals')
      .select('meal_type, score, score_band, foods_detected, logged_at')
      .eq('user_id', patientId)
      .gte('logged_at', since30Iso)
      .order('logged_at', { ascending: false })
      .limit(60),
  ])

  const profile = profileRes.data
  return {
    name: profile?.name ?? null,
    biological_sex: profile?.biological_sex ?? null,
    birth_date: profile?.birth_date ?? null,
    height_cm: profile?.height_cm ?? null,
    weight_kg: profile?.weight_kg ?? null,
    goals: goalsRes.data ?? null,
    activeRecommendation: recRes.data?.body ?? null,
    attachments: (attRes.data ?? [])
      .map((a) => a.extracted_text as string | null)
      .filter((t): t is string => Boolean(t)),
    labs: (labsRes.data ?? []).map((l) => ({
      marker: l.marker as string,
      value: l.value as number,
      unit: (l.unit as string | null) ?? null,
      reference_min: (l.reference_min as number | null) ?? null,
      reference_max: (l.reference_max as number | null) ?? null,
    })),
    meals: (mealsRes.data ?? []).map((m) => ({
      meal_type: (m.meal_type as string | null) ?? null,
      score: (m.score as number | null) ?? null,
      score_band: (m.score_band as string | null) ?? null,
      foods: Array.isArray(m.foods_detected)
        ? (m.foods_detected as Array<{ name?: string }>).map((f) => f?.name ?? '').filter(Boolean)
        : [],
    })),
  }
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? Math.round(n) : fallback
}

function normalizeMacros(raw: unknown): MealMacros {
  const m = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    calories: num(m.calories),
    protein_g: num(m.protein_g),
    carbs_g: num(m.carbs_g),
    fat_g: num(m.fat_g),
    fiber_g: num(m.fiber_g),
  }
}

// Models sometimes wrap JSON in ```json fences despite instructions — strip them.
function parseJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    // Last resort: grab the first {...} block
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1))
    }
    throw new Error('Resposta da IA não veio em JSON válido.')
  }
}

function ageFromDob(dob?: string | null): string {
  if (!dob) return '—'
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  return years > 0 && years < 130 ? `${years} anos` : '—'
}

export function buildPatientContextBlock(ctx: PatientContext): string {
  const lines: string[] = []

  lines.push('## PERFIL')
  lines.push(`- Sexo: ${ctx.biological_sex ?? '—'}`)
  lines.push(`- Idade: ${ageFromDob(ctx.birth_date)}`)
  lines.push(`- Altura: ${ctx.height_cm ? `${ctx.height_cm} cm` : '—'}`)
  lines.push(`- Peso: ${ctx.weight_kg ? `${ctx.weight_kg} kg` : '—'}`)

  lines.push('\n## METAS (alvo diário definido pelo nutricionista)')
  if (ctx.goals && (ctx.goals.calories_target || ctx.goals.protein_g || ctx.goals.carbs_g || ctx.goals.fat_g || ctx.goals.notes)) {
    lines.push(`- Calorias: ${ctx.goals.calories_target ?? '—'} kcal`)
    lines.push(`- Proteína: ${ctx.goals.protein_g ?? '—'} g`)
    lines.push(`- Carboidrato: ${ctx.goals.carbs_g ?? '—'} g`)
    lines.push(`- Gordura: ${ctx.goals.fat_g ?? '—'} g`)
    if (ctx.goals.notes) lines.push(`- Observações: ${ctx.goals.notes}`)
  } else {
    lines.push('- Metas de macros ainda não definidas. Use o perfil para estimar porções razoáveis.')
  }

  if (ctx.activeRecommendation) {
    lines.push('\n## ORIENTAÇÃO ATIVA DO NUTRICIONISTA (prioridade máxima)')
    lines.push(ctx.activeRecommendation)
  }

  if (ctx.attachments && ctx.attachments.length > 0) {
    lines.push('\n## MATERIAL DO NUTRICIONISTA (extraído dos PDFs enviados)')
    lines.push(ctx.attachments.map((a) => a.slice(0, 2500)).join('\n---\n').slice(0, 6000))
  }

  lines.push('\n## EXAMES DE SANGUE RECENTES')
  if (ctx.labs && ctx.labs.length > 0) {
    for (const l of ctx.labs) {
      const out =
        (l.reference_min !== null && l.value < l.reference_min) ||
        (l.reference_max !== null && l.value > l.reference_max)
      const ref =
        l.reference_min !== null || l.reference_max !== null
          ? ` (ref ${l.reference_min ?? '?'}–${l.reference_max ?? '?'})`
          : ''
      lines.push(`- ${l.marker}: ${l.value} ${l.unit ?? ''}${ref}${out ? '  ⚠ FORA DA FAIXA' : ''}`)
    }
  } else {
    lines.push('- Nenhum exame registrado.')
  }

  lines.push('\n## COISAS A MELHORAR (do histórico recente de refeições)')
  const meals = ctx.meals ?? []
  if (meals.length > 0) {
    const concerning = meals.filter((m) => m.score_band === 'atencao' || m.score_band === 'evitar')
    const avg =
      Math.round(meals.reduce((s, m) => s + (m.score ?? 0), 0) / meals.length) || 0
    lines.push(`- Score médio recente: ${avg}/100 em ${meals.length} refeições.`)
    lines.push(`- Refeições marcadas como "atenção"/"evitar": ${concerning.length}.`)
    const foods = concerning
      .flatMap((m) => m.foods ?? [])
      .filter(Boolean)
      .slice(0, 15)
    if (foods.length > 0) {
      lines.push(`- Alimentos recorrentes nas piores refeições: ${Array.from(new Set(foods)).join(', ')}.`)
    }
  } else {
    lines.push('- Sem refeições registradas ainda; baseie-se em metas e exames.')
  }

  return lines.join('\n')
}

/**
 * Generate a banco de opções for the requested meal types from the paciente's
 * clinical context. Returns drafts — the nutri reviews and saves them.
 */
export async function generateMealOptions(
  ctx: PatientContext,
  mealTypes: MealType[],
): Promise<GeneratedMealOption[]> {
  const contextBlock = buildPatientContextBlock(ctx)
  const wanted = mealTypes.length > 0 ? mealTypes : [...MEAL_TYPES]
  const ask = wanted.map((t) => `${t} (${MEAL_TYPE_LABEL_PT[t]})`).join(', ')

  const res = await client().messages.create({
    model: MEAL_GEN_MODEL,
    max_tokens: 4000,
    system: [{ type: 'text', text: NUTRI_MEAL_OPTIONS_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: `Gere opções para os tipos de refeição: ${ask}.\n\nCONTEXTO DO PACIENTE:\n${contextBlock}`,
      },
    ],
  })

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const parsed = parseJson(text) as { options?: unknown[] }
  const rawOptions = Array.isArray(parsed?.options) ? parsed.options : []
  const allowed = new Set<string>(wanted)

  return rawOptions
    .map((o) => {
      const r = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>
      const meal_type = String(r.meal_type ?? '')
      if (!allowed.has(meal_type)) return null
      const title = String(r.title ?? '').trim().slice(0, 200)
      if (!title) return null
      return {
        meal_type: meal_type as MealType,
        title,
        description: String(r.description ?? '').trim().slice(0, 2000),
        macros: normalizeMacros(r.macros),
        rationale: String(r.rationale ?? '').trim().slice(0, 500),
      } satisfies GeneratedMealOption
    })
    .filter((o): o is GeneratedMealOption => o !== null)
}

export interface MealSwapResult {
  title: string
  description: string
  macros: MealMacros
}

/**
 * Generate a "similar but different" alternative for one meal option the
 * paciente wants to swap. Stays within ~±15% of the original's macros and
 * respects the nutri's standing guidance.
 */
export async function generateMealSwap(
  ctx: PatientContext,
  original: { meal_type: MealType; title: string; description: string; macros: MealMacros },
  patientNote?: string,
): Promise<MealSwapResult> {
  const contextBlock = buildPatientContextBlock(ctx)
  const originalBlock = [
    `Tipo: ${original.meal_type} (${MEAL_TYPE_LABEL_PT[original.meal_type]})`,
    `Título: ${original.title}`,
    `Descrição: ${original.description}`,
    `Macros: ${original.macros.calories} kcal · P ${original.macros.protein_g}g · C ${original.macros.carbs_g}g · G ${original.macros.fat_g}g · Fibra ${original.macros.fiber_g}g`,
  ].join('\n')

  const res = await client().messages.create({
    model: MEAL_GEN_MODEL,
    max_tokens: 1200,
    system: [{ type: 'text', text: PATIENT_MEAL_SWAP_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content:
          `REFEIÇÃO ORIGINAL A TROCAR:\n${originalBlock}\n\n` +
          (patientNote ? `PEDIDO DO PACIENTE: ${patientNote.slice(0, 500)}\n\n` : '') +
          `CONTEXTO DO PACIENTE (respeite restrições e orientação):\n${contextBlock}`,
      },
    ],
  })

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const r = parseJson(text) as Record<string, unknown>
  const title = String(r.title ?? '').trim().slice(0, 200)
  if (!title) throw new Error('A IA não retornou uma alternativa válida.')
  return {
    title,
    description: String(r.description ?? '').trim().slice(0, 2000),
    macros: normalizeMacros(r.macros),
  }
}
