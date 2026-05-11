import { NextResponse, type NextRequest } from 'next/server'
import { isWhatsAppFeatureEnabled } from '@/lib/whatsapp/feature-flag'
import { createServiceClient } from '@/lib/supabase/service'
import { dispatchOutbound } from '@/lib/whatsapp/dispatch'
import { loadWeeklyReport, formatWeeklyReportPt } from '@/lib/whatsapp/weekly-report'
import type { WhatsAppConnection } from '@/lib/whatsapp/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface RunResult {
  user_id: string
  outcome: 'sent' | 'skipped' | 'error'
  reason?: string
}

function localWeekdayHourFor(timezone: string, when: Date = new Date()): { weekday: number; hour: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(when)
  const weekdayShort = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon'
  const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0'
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const weekday = map[weekdayShort] ?? 1
  const hour = parseInt(hourStr, 10)
  return { weekday, hour: Number.isFinite(hour) ? hour : 0 }
}

export async function GET(request: NextRequest) {
  if (!isWhatsAppFeatureEnabled()) {
    return NextResponse.json({ ok: false, reason: 'feature_disabled' }, { status: 503 })
  }

  const cronSecret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization') ?? ''
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()

  const { data: rows, error } = await supabase
    .from('whatsapp_connections')
    .select('*')
    .eq('status', 'verified')
    .eq('nudge_recap_enabled', true)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const results: RunResult[] = []

  for (const row of rows ?? []) {
    const conn = row as WhatsAppConnection
    try {
      // Fire on Monday 9am in the user's local timezone.
      const { weekday, hour } = localWeekdayHourFor(conn.timezone, now)
      if (weekday !== 1 || hour !== 9) {
        continue
      }

      // Dedupe — don't double-send if the cron tick fires twice within an hour.
      const lastSent = conn.last_weekly_report_at ? new Date(conn.last_weekly_report_at).getTime() : 0
      if (lastSent && now.getTime() - lastSent < 6 * 24 * 60 * 60 * 1000) {
        results.push({ user_id: conn.user_id, outcome: 'skipped', reason: 'sent_recently' })
        continue
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', conn.user_id)
        .maybeSingle()
      const name = (profile?.name as string | undefined) || ''

      const data = await loadWeeklyReport(supabase, conn.user_id)
      const message = formatWeeklyReportPt(name, data)

      const dispatched = await dispatchOutbound({
        supabase,
        conn,
        content: message,
        source: 'cron_weekly_report',
        metadata: {
          mealsCount: data.mealsCount,
          daysLogged: data.daysLogged,
          avgScore: data.avgScore,
        },
      })

      if (!dispatched.ok) {
        results.push({ user_id: conn.user_id, outcome: 'error', reason: dispatched.error })
        continue
      }

      await supabase
        .from('whatsapp_connections')
        .update({ last_weekly_report_at: now.toISOString() })
        .eq('user_id', conn.user_id)

      results.push({ user_id: conn.user_id, outcome: 'sent' })
    } catch (err) {
      console.error('[cron-weekly-report] user failed', conn.user_id, err)
      results.push({ user_id: conn.user_id, outcome: 'error', reason: String(err) })
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
