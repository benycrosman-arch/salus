import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateCoachReminder, type ReminderSlot } from '@/lib/coach/engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface RunResult {
  user_id: string
  slot?: ReminderSlot
  outcome: 'sent' | 'skipped' | 'error'
  reason?: string
}

// Local-hour → slot. One reminder per slot per local day (deduped below).
function slotForHour(hour: number): ReminderSlot | null {
  if (hour >= 11 && hour < 13) return 'lunch'
  if (hour >= 18 && hour < 20) return 'dinner'
  if (hour === 21) return 'recap'
  return null
}

function localHourFor(timezone: string, when: Date): number {
  const value = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  }).format(when)
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : when.getUTCHours()
}

function localDateFor(timezone: string, when: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(when)
}

const SLOT_TITLES: Record<ReminderSlot, string> = {
  lunch: 'Hora do almoço 🍽️',
  dinner: 'Janela do jantar',
  recap: 'Resumo do dia',
  hydration: 'Hidratação',
}

const FALLBACK_BODY: Record<ReminderSlot, string> = {
  lunch: 'Bora montar um almoço com boa dose de proteína? Te ajudo a fechar a meta de hoje.',
  dinner: 'Que tal fechar o dia batendo a meta de fibra e proteína sem estourar as calorias?',
  recap: 'Passa aqui pra ver como foi seu dia: score, proteína e seu streak.',
  hydration: 'Lembrete de água — dá uma olhada em quanto falta pra meta de hoje.',
}

/**
 * Proactive in-app coach reminders.
 *
 * Runs hourly (Vercel cron). For each user who opted into reminders, if their
 * LOCAL hour maps to a slot and that slot hasn't fired today, it asks the coach
 * to author a short grounded reminder and writes it as a coach_notification.
 * The app surfaces these in the bell when the person next opens Salus. The same
 * rows are the seam for native push later (delivered_push flag).
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization') ?? ''
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()

  const { data: rows, error } = await supabase
    .from('coach_settings')
    .select('user_id, timezone, last_reminder_at')
    .eq('reminders_enabled', true)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const results: RunResult[] = []

  for (const row of rows ?? []) {
    const userId = row.user_id as string
    const timezone = (row.timezone as string) || 'America/Sao_Paulo'
    try {
      const localHour = localHourFor(timezone, now)
      const slot = slotForHour(localHour)
      if (!slot) continue

      // Dedupe: skip if any reminder of this slot already exists for the user's
      // local day.
      const today = localDateFor(timezone, now)
      const kind = `reminder_${slot}`
      const { data: existing } = await supabase
        .from('coach_notifications')
        .select('id, created_at')
        .eq('user_id', userId)
        .eq('kind', kind)
        .order('created_at', { ascending: false })
        .limit(1)
      if (existing?.[0] && localDateFor(timezone, new Date(existing[0].created_at)) === today) {
        results.push({ user_id: userId, slot, outcome: 'skipped', reason: 'already_sent_today' })
        continue
      }

      let body = FALLBACK_BODY[slot]
      try {
        const out = await generateCoachReminder({ supabase, userId, timezone, slot })
        if (out.text) body = out.text
      } catch (err) {
        console.error('[coach-reminders] LLM failed, using fallback', userId, err)
      }

      const { error: insErr } = await supabase.from('coach_notifications').insert({
        user_id: userId,
        kind,
        title: SLOT_TITLES[slot],
        body,
      })
      if (insErr) {
        results.push({ user_id: userId, slot, outcome: 'error', reason: insErr.message })
        continue
      }

      await supabase
        .from('coach_settings')
        .update({ last_reminder_at: now.toISOString() })
        .eq('user_id', userId)

      results.push({ user_id: userId, slot, outcome: 'sent' })
    } catch (err) {
      console.error('[coach-reminders] user failed', userId, err)
      results.push({ user_id: userId, outcome: 'error', reason: String(err) })
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
