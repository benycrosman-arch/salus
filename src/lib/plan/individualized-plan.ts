import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { WEEKLY_PLAN_PROMPT } from '@/lib/prompts'

// Sonnet matches the WhatsApp coach; enough headroom for a full 7-day plan.
const PLAN_MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 8000

const MAX_ATTACHMENT_CHARS_EACH = 2000
const MAX_ATTACHMENT_CHARS_TOTAL = 5000

export interface PlanMeal {
  name: string
  description: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface PlanDay {
  day: string
  meals: {
    breakfast: PlanMeal
    snack1: PlanMeal
    lunch: PlanMeal
    snack2: PlanMeal
    dinner: PlanMeal
  }
}

export interface PlanGroceryItem {
  name: string
  quantity: string
  category: 'produce' | 'protein' | 'pantry' | 'dairy' | 'snacks'
  estimatedPrice: number
}

export interface IndividualizedPlan {
  targets: {
    kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
    fiber_g: number
    rationale: string
  }
  days: PlanDay[]
  groceryList: PlanGroceryItem[]
  notes: string
}

let _client: Anthropic | null = null
function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
  if (!_client) _client = new Anthropic({ apiKey })
  return _client
}

function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age >= 0 && age < 130 ? age : null
}

/**
 * Builds the per-patient context block that drives the plan. Runs under the
 * patient's own RLS client — every table here is readable by the patient for
 * their own rows (nutri_recommendations / attachments have a "Paciente reads
 * own" policy from migration 026), so no service role is needed.
 */
async function buildPatientContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const [profileRes, prefsRes, mealsRes, labsRes, recRes, attRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, ai_daily_goals, weight_kg, height_cm, biological_sex, birth_date, activity_level')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('user_preferences')
      .select('diet_type, allergies, goals')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('meals')
      .select('meal_type, score, macros, logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(30),
    supabase
      .from('lab_results')
      .select('marker, value, unit, reference_min, reference_max, measured_at')
      .eq('user_id', userId)
      .order('measured_at', { ascending: false })
      .limit(40),
    supabase
      .from('nutri_recommendations')
      .select('body')
      .eq('patient_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('nutri_patient_attachments')
      .select('kind, original_filename, extracted_text')
      .eq('patient_id', userId)
      .not('extracted_text', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const profile = profileRes.data
  const prefs = prefsRes.data
  const lines: string[] = []

  // Nutri guidance first — the prompt treats it as top priority.
  const guidance = (recRes.data?.body as string | undefined)?.trim()
  if (guidance) {
    lines.push('## ORIENTAÇÃO DO NUTRICIONISTA (PRIORIDADE MÁXIMA)')
    lines.push(guidance)
    lines.push('')
  }
  let budget = MAX_ATTACHMENT_CHARS_TOTAL
  const attachments = (attRes.data ?? []) as Array<{
    kind?: string | null
    original_filename?: string | null
    extracted_text?: string | null
  }>
  const renderedAtt: string[] = []
  for (const a of attachments) {
    if (budget <= 0) break
    const raw = (a.extracted_text ?? '').trim()
    if (!raw) continue
    const slice = raw.slice(0, Math.min(MAX_ATTACHMENT_CHARS_EACH, budget))
    budget -= slice.length
    const label = [a.kind, a.original_filename].filter(Boolean).join(' / ')
    renderedAtt.push(`--- ${label} ---`)
    renderedAtt.push(slice)
  }
  if (renderedAtt.length) {
    lines.push('## MATERIAL DO NUTRICIONISTA (conteúdo dos PDFs)')
    lines.push(...renderedAtt)
    lines.push('')
  }

  lines.push('## PERFIL DO PACIENTE')
  lines.push(`Nome: ${profile?.name?.trim() || 'paciente'}`)
  const sexMap: Record<string, string> = { male: 'masculino', female: 'feminino', other: 'outro' }
  if (profile?.biological_sex) lines.push(`Sexo biológico: ${sexMap[profile.biological_sex] ?? profile.biological_sex}`)
  const age = ageFromBirthDate(profile?.birth_date ?? null)
  if (age !== null) lines.push(`Idade: ${age} anos`)
  if (profile?.weight_kg) lines.push(`Peso: ${profile.weight_kg} kg`)
  if (profile?.height_cm) lines.push(`Altura: ${profile.height_cm} cm`)
  if (profile?.activity_level) lines.push(`Nível de atividade: ${profile.activity_level}`)

  const goals = profile?.ai_daily_goals as
    | { kcal?: number; protein_g?: number; carbs_g?: number; fat_g?: number; fiber_g?: number }
    | null
  if (goals && (goals.kcal || goals.protein_g)) {
    lines.push(
      `Metas diárias já definidas: ${goals.kcal ?? '?'} kcal · ${goals.protein_g ?? '?'}g proteína · ${goals.carbs_g ?? '?'}g carbo · ${goals.fat_g ?? '?'}g gordura · ${goals.fiber_g ?? '?'}g fibra`,
    )
  } else {
    lines.push('Metas diárias: não definidas — calcule a partir do perfil e do objetivo.')
  }

  lines.push('')
  lines.push('## PREFERÊNCIAS E OBJETIVOS')
  lines.push(`Tipo de dieta: ${prefs?.diet_type || 'não informado'}`)
  const allergies = (prefs?.allergies as string[] | null) ?? []
  lines.push(`Alergias / restrições (ABSOLUTO): ${allergies.length ? allergies.join(', ') : 'nenhuma informada'}`)
  const objectives = (prefs?.goals as string[] | null) ?? []
  if (objectives.length) lines.push(`Objetivos: ${objectives.join(', ')}`)

  const labs = (labsRes.data ?? []) as Array<{
    marker: string
    value: number
    unit: string
    reference_min: number | null
    reference_max: number | null
    measured_at: string
  }>
  if (labs.length) {
    // Keep only the most recent reading per marker.
    const latest = new Map<string, (typeof labs)[number]>()
    for (const l of labs) if (!latest.has(l.marker)) latest.set(l.marker, l)
    lines.push('')
    lines.push('## EXAMES LABORATORIAIS (mais recentes)')
    for (const l of Array.from(latest.values())) {
      const ref =
        l.reference_min !== null || l.reference_max !== null
          ? ` (ref ${l.reference_min ?? ''}–${l.reference_max ?? ''})`
          : ''
      lines.push(`- ${l.marker}: ${l.value} ${l.unit}${ref} [${l.measured_at}]`)
    }
  }

  const meals = (mealsRes.data ?? []) as Array<{
    meal_type: string
    score: number | null
    macros: { calories?: number; protein?: number; fiber?: number } | null
  }>
  if (meals.length) {
    const n = meals.length
    const avg = (sel: (m: (typeof meals)[number]) => number) =>
      Math.round(meals.reduce((s, m) => s + sel(m), 0) / n)
    lines.push('')
    lines.push('## PADRÃO ALIMENTAR REGISTRADO (últimas refeições)')
    lines.push(
      `Média por refeição: ${avg((m) => m.macros?.calories ?? 0)} kcal · ${avg((m) => m.macros?.protein ?? 0)}g proteína · ${avg((m) => m.macros?.fiber ?? 0)}g fibra · score ${avg((m) => m.score ?? 0)}`,
    )
    const byType = meals.reduce<Record<string, number>>((acc, m) => {
      acc[m.meal_type] = (acc[m.meal_type] ?? 0) + 1
      return acc
    }, {})
    lines.push(`Distribuição registrada: ${Object.entries(byType).map(([t, c]) => `${t} ×${c}`).join(', ')}`)
  }

  return lines.join('\n')
}

function parsePlan(raw: string): IndividualizedPlan {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned
  const parsed = JSON.parse(json) as IndividualizedPlan
  if (!Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new Error('Plano sem dias.')
  }
  if (!Array.isArray(parsed.groceryList)) parsed.groceryList = []
  return parsed
}

/**
 * Generates a fully individualized 7-day plan for one patient. Loads the
 * patient's profile, preferences, labs, recent eating pattern, and their
 * nutricionista's standing guidance, then asks the model to honor all of it.
 */
export async function generateIndividualizedPlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<IndividualizedPlan> {
  const context = await buildPatientContext(supabase, userId)

  const res = await client().messages.create({
    model: PLAN_MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      { type: 'text', text: WEEKLY_PLAN_PROMPT, cache_control: { type: 'ephemeral' } },
    ] as unknown as Anthropic.TextBlockParam[],
    messages: [
      {
        role: 'user',
        content: `Monte o plano de 7 dias para este paciente, seguindo a ficha abaixo à risca.\n\n${context}`,
      },
    ],
  })

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')

  return parsePlan(text)
}
