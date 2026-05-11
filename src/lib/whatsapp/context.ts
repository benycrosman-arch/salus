import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  DailyDelta,
  DailyGoals,
  DailyTotals,
  MealLog,
  MealWindow,
  NutriGuidance,
  StreakInfo,
  UserContext,
} from './types'

const MAX_ATTACHMENT_CHARS_EACH = 2000
const MAX_ATTACHMENT_CHARS_TOTAL = 5000

async function loadNutriGuidance(
  supabase: SupabaseClient,
  userId: string,
): Promise<NutriGuidance> {
  try {
    const [recRes, attRes] = await Promise.all([
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

    const active = (recRes.data?.body as string | undefined)?.trim() || null
    const attachments: NutriGuidance['attachments'] = []
    let budget = MAX_ATTACHMENT_CHARS_TOTAL
    for (const row of attRes.data ?? []) {
      if (budget <= 0) break
      const raw = ((row as { extracted_text?: string | null }).extracted_text ?? '').trim()
      if (!raw) continue
      const slice = raw.slice(0, Math.min(MAX_ATTACHMENT_CHARS_EACH, budget))
      budget -= slice.length
      attachments.push({
        kind: ((row as { kind?: string | null }).kind ?? 'other') as string,
        filename: ((row as { original_filename?: string | null }).original_filename ?? null) as
          | string
          | null,
        text: slice,
      })
    }
    return { active, attachments }
  } catch {
    return { active: null, attachments: [] }
  }
}

const DEFAULT_GOALS: DailyGoals = {
  kcal: 2000,
  protein_g: 110,
  carbs_g: 220,
  fat_g: 65,
  fiber_g: 28,
  water_ml: 2500,
}

function localISO(timezone: string, when: Date = new Date()): { iso: string; hour: number; date: string } {
  // sv-SE locale gives ISO-like "YYYY-MM-DD HH:MM:SS" output that is easy to parse.
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(when)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  const date = `${get('year')}-${get('month')}-${get('day')}`
  const hour = Number(get('hour'))
  const iso = `${date}T${get('hour')}:${get('minute')}:${get('second')}`
  return { iso, hour, date }
}

export function classifyMealWindow(localHour: number): MealWindow {
  if (localHour < 6) return 'overnight'
  if (localHour < 7) return 'pre_breakfast'
  if (localHour < 9) return 'breakfast'
  if (localHour < 11) return 'mid_morning'
  if (localHour < 12) return 'pre_lunch'
  if (localHour < 14) return 'lunch'
  if (localHour < 17) return 'afternoon'
  if (localHour < 19) return 'pre_dinner'
  if (localHour < 21) return 'dinner'
  if (localHour < 24) return 'evening'
  return 'overnight'
}

function sumTotals(meals: MealLog[]): DailyTotals {
  const totals: DailyTotals = {
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    meals_count: meals.length,
    avg_score: null,
  }
  let scoreSum = 0
  let scoreN = 0
  for (const m of meals) {
    if (m.macros) {
      totals.kcal += Number(m.macros.calories ?? 0)
      totals.protein_g += Number(m.macros.protein ?? 0)
      totals.carbs_g += Number(m.macros.carbs ?? 0)
      totals.fat_g += Number(m.macros.fat ?? 0)
      totals.fiber_g += Number(m.macros.fiber ?? 0)
    }
    if (typeof m.score === 'number') {
      scoreSum += m.score
      scoreN += 1
    }
  }
  totals.avg_score = scoreN > 0 ? Math.round(scoreSum / scoreN) : null
  return totals
}

function computeDelta(goals: DailyGoals, totals: DailyTotals): DailyDelta {
  return {
    protein_remaining_g: Math.max(0, Math.round(goals.protein_g - totals.protein_g)),
    fiber_remaining_g: Math.max(0, Math.round(goals.fiber_g - totals.fiber_g)),
    water_remaining_ml: Math.max(0, goals.water_ml), // hydration logging not yet wired; full target remains
    kcal_remaining: Math.max(0, Math.round(goals.kcal - totals.kcal)),
  }
}

interface LoadContextOptions {
  supabase: SupabaseClient
  userId: string
  timezone?: string
  locale?: 'pt' | 'en'
  recentMessageLimit?: number
}

/**
 * Loads everything the WhatsApp coach needs for one turn.
 * Reuses the same Supabase tables that power the in-app dashboard so the
 * agent's view is identical to what the user sees in Salus.
 */
export async function loadUserContext(opts: LoadContextOptions): Promise<UserContext> {
  const {
    supabase,
    userId,
    timezone = 'America/Sao_Paulo',
    locale = 'pt',
    recentMessageLimit = 10,
  } = opts

  const { iso, hour, date } = localISO(timezone)

  const [profileRes, prefsRes, mealsRes, streaksRes, recentMsgsRes, nutriGuidance] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('name, ai_daily_goals, weight_kg, height_cm, biological_sex, birth_date')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('user_preferences')
        .select('diet_type, allergies, goals')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('meals')
        .select('id, meal_type, score, score_band, macros, logged_at, user_notes')
        .eq('user_id', userId)
        .gte('logged_at', `${date}T00:00:00`)
        .lte('logged_at', `${date}T23:59:59`)
        .order('logged_at', { ascending: true }),
      supabase
        .from('streaks')
        .select('current_streak, longest_streak, last_logged_date')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('whatsapp_messages')
        .select('direction, content')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(recentMessageLimit),
      loadNutriGuidance(supabase, userId),
    ])

  const profile = profileRes.data
  const prefs = prefsRes.data
  const meals = (mealsRes.data ?? []) as MealLog[]
  const streak = streaksRes.data

  const goals: DailyGoals = (profile?.ai_daily_goals as DailyGoals) ?? DEFAULT_GOALS
  const totals = sumTotals(meals)
  const delta = computeDelta(goals, totals)

  const streakInfo: StreakInfo = {
    current: streak?.current_streak ?? 0,
    longest: streak?.longest_streak ?? 0,
    last_logged_date: streak?.last_logged_date ?? null,
  }

  // recent messages came back DESC; the agent wants chronological.
  const recentMessages = (recentMsgsRes.data ?? [])
    .map((m) => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content as string,
    }))
    .reverse()

  return {
    userId,
    name: profile?.name?.trim() || 'amig@',
    locale,
    timezone,
    goals,
    todayMeals: meals,
    todayTotals: totals,
    delta,
    streak: streakInfo,
    preferences: {
      diet_type: prefs?.diet_type ?? null,
      allergies: (prefs?.allergies as string[] | null) ?? [],
      goals: (prefs?.goals as string[] | null) ?? [],
    },
    nutriGuidance,
    recentMessages,
    localTimeISO: iso,
    localHour: hour,
    mealWindow: classifyMealWindow(hour),
  }
}

/**
 * Renders the user context as a compact text block to inject into the system
 * prompt. Plain text — easier to cache than JSON, and the agent works with
 * narrative context better than nested objects.
 */
function renderNutriGuidance(g: NutriGuidance, lang: 'pt' | 'en'): string[] {
  if (!g.active && g.attachments.length === 0) return []
  const out: string[] = []
  if (lang === 'pt') {
    out.push('## ORIENTAÇÃO DO NUTRICIONISTA (PRIORIDADE MÁXIMA — siga isso antes de qualquer sugestão genérica)')
    if (g.active) out.push(g.active)
    if (g.attachments.length > 0) {
      out.push('')
      out.push('## MATERIAL DO NUTRICIONISTA (conteúdo dos PDFs)')
      for (const a of g.attachments) {
        const label = [a.kind, a.filename].filter(Boolean).join(' / ')
        out.push(`--- ${label} ---`)
        out.push(a.text)
      }
    }
    out.push('')
  } else {
    out.push("## NUTRITIONIST'S STANDING GUIDANCE (TOP PRIORITY — follow this before any generic advice)")
    if (g.active) out.push(g.active)
    if (g.attachments.length > 0) {
      out.push('')
      out.push('## NUTRITIONIST MATERIALS (PDF content)')
      for (const a of g.attachments) {
        const label = [a.kind, a.filename].filter(Boolean).join(' / ')
        out.push(`--- ${label} ---`)
        out.push(a.text)
      }
    }
    out.push('')
  }
  return out
}

export function renderContextBlock(ctx: UserContext): string {
  const lines: string[] = []
  const lang = ctx.locale === 'en' ? 'en' : 'pt'

  lines.push(...renderNutriGuidance(ctx.nutriGuidance, lang))

  if (lang === 'pt') {
    lines.push(`Usuário: ${ctx.name} (id ${ctx.userId})`)
    lines.push(`Hora local: ${ctx.localTimeISO} (${ctx.timezone}) — janela: ${ctx.mealWindow}`)
    if (ctx.goals) {
      lines.push(
        `Metas diárias: ${ctx.goals.kcal} kcal · ${ctx.goals.protein_g}g proteína · ${ctx.goals.fiber_g}g fibra · ${ctx.goals.water_ml} ml água`,
      )
    }
    lines.push(
      `Hoje: ${ctx.todayTotals.meals_count} refeições · ${Math.round(ctx.todayTotals.kcal)} kcal · ${Math.round(ctx.todayTotals.protein_g)}g proteína · ${Math.round(ctx.todayTotals.fiber_g)}g fibra · score médio ${ctx.todayTotals.avg_score ?? 'n/d'}`,
    )
    lines.push(
      `Faltando: ${ctx.delta.protein_remaining_g}g proteína · ${ctx.delta.fiber_remaining_g}g fibra · ${ctx.delta.kcal_remaining} kcal · ${ctx.delta.water_remaining_ml} ml água`,
    )
    lines.push(`Streak: ${ctx.streak.current} dias (recorde ${ctx.streak.longest})`)
    if (ctx.preferences.diet_type) lines.push(`Dieta: ${ctx.preferences.diet_type}`)
    if (ctx.preferences.allergies.length) lines.push(`Alergias: ${ctx.preferences.allergies.join(', ')}`)
    if (ctx.preferences.goals.length) lines.push(`Objetivos: ${ctx.preferences.goals.join(', ')}`)
    if (ctx.todayMeals.length) {
      lines.push('Refeições registradas hoje:')
      for (const m of ctx.todayMeals) {
        const cal = m.macros?.calories ? Math.round(m.macros.calories) : '?'
        const prot = m.macros?.protein ? Math.round(m.macros.protein) : '?'
        const score = m.score ?? '?'
        lines.push(`  - ${m.meal_type} @ ${m.logged_at}: ${cal} kcal, ${prot}g proteína, score ${score}`)
      }
    }
  } else {
    lines.push(`User: ${ctx.name} (id ${ctx.userId})`)
    lines.push(`Local time: ${ctx.localTimeISO} (${ctx.timezone}) — window: ${ctx.mealWindow}`)
    if (ctx.goals) {
      lines.push(
        `Daily goals: ${ctx.goals.kcal} kcal · ${ctx.goals.protein_g}g protein · ${ctx.goals.fiber_g}g fiber · ${ctx.goals.water_ml} ml water`,
      )
    }
    lines.push(
      `Today: ${ctx.todayTotals.meals_count} meals · ${Math.round(ctx.todayTotals.kcal)} kcal · ${Math.round(ctx.todayTotals.protein_g)}g protein · ${Math.round(ctx.todayTotals.fiber_g)}g fiber · avg score ${ctx.todayTotals.avg_score ?? 'n/a'}`,
    )
    lines.push(
      `Remaining: ${ctx.delta.protein_remaining_g}g protein · ${ctx.delta.fiber_remaining_g}g fiber · ${ctx.delta.kcal_remaining} kcal · ${ctx.delta.water_remaining_ml} ml water`,
    )
    lines.push(`Streak: ${ctx.streak.current} days (best ${ctx.streak.longest})`)
    if (ctx.preferences.diet_type) lines.push(`Diet: ${ctx.preferences.diet_type}`)
    if (ctx.preferences.allergies.length) lines.push(`Allergies: ${ctx.preferences.allergies.join(', ')}`)
    if (ctx.preferences.goals.length) lines.push(`Goals: ${ctx.preferences.goals.join(', ')}`)
    if (ctx.todayMeals.length) {
      lines.push('Logged meals today:')
      for (const m of ctx.todayMeals) {
        const cal = m.macros?.calories ? Math.round(m.macros.calories) : '?'
        const prot = m.macros?.protein ? Math.round(m.macros.protein) : '?'
        const score = m.score ?? '?'
        lines.push(`  - ${m.meal_type} @ ${m.logged_at}: ${cal} kcal, ${prot}g protein, score ${score}`)
      }
    }
  }

  return lines.join('\n')
}
