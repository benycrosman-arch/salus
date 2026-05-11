import type { SupabaseClient } from '@supabase/supabase-js'

export interface WeeklyReportData {
  mealsCount: number
  daysLogged: number
  avgScore: number | null
  bestMeal: { score: number; meal_type: string | null; logged_at: string } | null
  streakDays: number
  proteinAvgG: number | null
  fiberAvgG: number | null
}

interface MealRow {
  id: string
  meal_type: string | null
  score: number | null
  logged_at: string
  macros: { protein?: number; fiber?: number } | null
}

const MEAL_TYPE_LABEL_PT: Record<string, string> = {
  breakfast: 'café da manhã',
  snack1: 'lanche da manhã',
  lunch: 'almoço',
  snack2: 'lanche da tarde',
  dinner: 'jantar',
  other: 'refeição',
}

export async function loadWeeklyReport(
  supabase: SupabaseClient,
  userId: string,
): Promise<WeeklyReportData> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const since = sevenDaysAgo.toISOString()

  const [mealsRes, streakRes] = await Promise.all([
    supabase
      .from('meals')
      .select('id, meal_type, score, logged_at, macros')
      .eq('user_id', userId)
      .gte('logged_at', since)
      .order('score', { ascending: false }),
    supabase
      .from('streaks')
      .select('current')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const meals = (mealsRes.data ?? []) as MealRow[]
  const mealsCount = meals.length
  const dayKeys = new Set<string>()
  let scoreSum = 0
  let scoreCount = 0
  let proteinSum = 0
  let proteinCount = 0
  let fiberSum = 0
  let fiberCount = 0
  let best: MealRow | null = null

  for (const m of meals) {
    dayKeys.add(m.logged_at.slice(0, 10))
    if (typeof m.score === 'number') {
      scoreSum += m.score
      scoreCount += 1
      if (!best || (m.score > (best.score ?? 0))) best = m
    }
    const protein = m.macros?.protein
    if (typeof protein === 'number') {
      proteinSum += protein
      proteinCount += 1
    }
    const fiber = m.macros?.fiber
    if (typeof fiber === 'number') {
      fiberSum += fiber
      fiberCount += 1
    }
  }

  const streakRow = streakRes.data as { current?: number } | null

  return {
    mealsCount,
    daysLogged: dayKeys.size,
    avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
    bestMeal: best
      ? { score: best.score ?? 0, meal_type: best.meal_type, logged_at: best.logged_at }
      : null,
    streakDays: streakRow?.current ?? 0,
    proteinAvgG: proteinCount > 0 ? Math.round(proteinSum / proteinCount) : null,
    fiberAvgG: fiberCount > 0 ? Math.round(fiberSum / fiberCount) : null,
  }
}

export function formatWeeklyReportPt(name: string, data: WeeklyReportData): string {
  if (data.mealsCount === 0) {
    return [
      `Oi ${name || 'tudo bem'} 👋`,
      '',
      `Semana sem refeições registradas no Salus. Tudo bem — recomeça hoje com uma foto do café da manhã.`,
    ].join('\n')
  }

  const lines: string[] = []
  lines.push(`Oi ${name || ''}, seu resumo da semana no Salus:`)
  lines.push('')
  lines.push(`• ${data.mealsCount} refeição${data.mealsCount === 1 ? '' : 'ões'} em ${data.daysLogged} dia${data.daysLogged === 1 ? '' : 's'}`)
  if (data.avgScore !== null) {
    lines.push(`• Score médio: ${data.avgScore}/100`)
  }
  if (data.bestMeal) {
    const label = MEAL_TYPE_LABEL_PT[data.bestMeal.meal_type ?? 'other'] ?? 'refeição'
    lines.push(`• Melhor refeição: ${label} (${data.bestMeal.score})`)
  }
  if (data.proteinAvgG !== null) {
    lines.push(`• Proteína média: ${data.proteinAvgG}g por refeição`)
  }
  if (data.fiberAvgG !== null) {
    lines.push(`• Fibra média: ${data.fiberAvgG}g por refeição`)
  }
  if (data.streakDays > 0) {
    lines.push(`• Streak atual: ${data.streakDays} dia${data.streakDays === 1 ? '' : 's'} 🔥`)
  }
  lines.push('')
  lines.push('Bora pra mais uma semana? Manda a foto do café da manhã quando começar.')
  return lines.join('\n')
}
