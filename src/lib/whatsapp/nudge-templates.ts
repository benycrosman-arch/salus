import type { UserContext, WhatsAppConnection } from './types'

export type NudgeSlot = 'lunch' | 'dinner' | 'recap' | 'hydration'

export interface NudgeDecision {
  slot: NudgeSlot
  /** Within the 24h Meta service window the agent can send free-form text. */
  withinServiceWindow: boolean
  /** Approved Meta template name to use when outside the service window. */
  templateName: string
  /** Pre-computed template variables. The same numbers go to the LLM in-context. */
  templateParams: Record<string, string>
  /** Localized fallback text for use when the LLM is unavailable. */
  fallbackText: string
}

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

export function isWithinServiceWindow(conn: Pick<WhatsAppConnection, 'last_message_at'>, now: Date = new Date()): boolean {
  if (!conn.last_message_at) return false
  const last = new Date(conn.last_message_at).getTime()
  return now.getTime() - last < SERVICE_WINDOW_MS
}

function templateName(slot: NudgeSlot): string {
  switch (slot) {
    case 'recap':
      return process.env.CHATWOOT_TEMPLATE_DAILY_RECAP || 'salus_daily_recap'
    case 'lunch':
    case 'dinner':
    case 'hydration':
    default:
      return process.env.CHATWOOT_TEMPLATE_MEAL_NUDGE || 'salus_meal_nudge'
  }
}

function fallbackPt(ctx: UserContext, slot: NudgeSlot): string {
  const proteinLeft = ctx.delta.protein_remaining_g
  const fiberLeft = ctx.delta.fiber_remaining_g
  const waterLeft = ctx.delta.water_remaining_ml
  const score = ctx.todayTotals.avg_score
  const streak = ctx.streak.current

  switch (slot) {
    case 'lunch':
      return `É hora do almoço. Foca em proteína (faltam ${proteinLeft}g hoje) e bebe um copo d'água antes de começar.`
    case 'dinner':
      return `Janela do jantar começou. Inclui uma fonte de fibra (faltam ${fiberLeft}g) e mantém a proteína em pé — restam ${proteinLeft}g.`
    case 'hydration':
      return `Lembrete de água: ainda faltam ~${waterLeft} ml para fechar a meta de hidratação de hoje.`
    case 'recap':
      return `Fechamento do dia. Score médio: ${score ?? 'sem registro'}. Streak: ${streak} dia(s). ${proteinLeft === 0 ? 'Proteína batida.' : `Faltaram ${proteinLeft}g de proteína.`}`
  }
}

function fallbackEn(ctx: UserContext, slot: NudgeSlot): string {
  const proteinLeft = ctx.delta.protein_remaining_g
  const fiberLeft = ctx.delta.fiber_remaining_g
  const waterLeft = ctx.delta.water_remaining_ml
  const score = ctx.todayTotals.avg_score
  const streak = ctx.streak.current

  switch (slot) {
    case 'lunch':
      return `Lunch time. Focus on protein (${proteinLeft}g left today) and have a glass of water before you start.`
    case 'dinner':
      return `Dinner window is open. Add a fiber source (${fiberLeft}g left) and keep protein up — ${proteinLeft}g remaining.`
    case 'hydration':
      return `Water reminder: about ${waterLeft} ml left to hit today's hydration goal.`
    case 'recap':
      return `End-of-day recap. Avg score: ${score ?? 'n/a'}. Streak: ${streak} day(s). ${proteinLeft === 0 ? 'Protein hit.' : `Missed ${proteinLeft}g of protein.`}`
  }
}

export function buildDecision(
  ctx: UserContext,
  conn: Pick<WhatsAppConnection, 'last_message_at'>,
  slot: NudgeSlot,
): NudgeDecision {
  const isPt = ctx.locale !== 'en'
  const fallback = isPt ? fallbackPt(ctx, slot) : fallbackEn(ctx, slot)
  return {
    slot,
    withinServiceWindow: isWithinServiceWindow(conn),
    templateName: templateName(slot),
    templateParams: {
      name: ctx.name,
      meal_window: ctx.mealWindow,
      protein_remaining_g: String(ctx.delta.protein_remaining_g),
      fiber_remaining_g: String(ctx.delta.fiber_remaining_g),
      water_remaining_ml: String(ctx.delta.water_remaining_ml),
      kcal_remaining: String(ctx.delta.kcal_remaining),
      score: String(ctx.todayTotals.avg_score ?? 0),
      meals_logged: String(ctx.todayTotals.meals_count),
      streak_days: String(ctx.streak.current),
    },
    fallbackText: fallback,
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Slot eligibility — pure functions, easy to test.
// Each returns true when the slot should fire RIGHT NOW for this user.
// ───────────────────────────────────────────────────────────────────────────

interface SlotInputs {
  ctx: UserContext
  conn: WhatsAppConnection
  /** Cron tick time, in user's local timezone (we already convert before calling). */
  localHour: number
}

function hoursSince(timestamp: string | null, now: Date = new Date()): number {
  if (!timestamp) return Infinity
  return (now.getTime() - new Date(timestamp).getTime()) / (1000 * 60 * 60)
}

export function shouldFireLunch(input: SlotInputs): boolean {
  const { ctx, conn, localHour } = input
  if (!conn.nudge_lunch_enabled) return false
  if (localHour !== 11) return false // ~11:30 local — cron runs at HH:00 so we fire at 11
  if (hoursSince(conn.last_nudge_lunch_at) < 12) return false
  // Skip if user already logged a lunch.
  if (ctx.todayMeals.some((m) => m.meal_type === 'lunch')) return false
  return true
}

export function shouldFireDinner(input: SlotInputs): boolean {
  const { ctx, conn, localHour } = input
  if (!conn.nudge_dinner_enabled) return false
  if (localHour !== 18) return false
  if (hoursSince(conn.last_nudge_dinner_at) < 12) return false
  if (ctx.todayMeals.some((m) => m.meal_type === 'dinner')) return false
  return true
}

export function shouldFireRecap(input: SlotInputs): boolean {
  const { conn, localHour } = input
  if (!conn.nudge_recap_enabled) return false
  if (localHour !== 21) return false
  if (hoursSince(conn.last_nudge_recap_at) < 20) return false
  return true
}

export function pickSlot(input: SlotInputs): NudgeSlot | null {
  if (shouldFireLunch(input)) return 'lunch'
  if (shouldFireDinner(input)) return 'dinner'
  if (shouldFireRecap(input)) return 'recap'
  return null
}

export function lastNudgeColumn(slot: NudgeSlot): string | null {
  switch (slot) {
    case 'lunch':
      return 'last_nudge_lunch_at'
    case 'dinner':
      return 'last_nudge_dinner_at'
    case 'recap':
      return 'last_nudge_recap_at'
    case 'hydration':
      return null
  }
}
