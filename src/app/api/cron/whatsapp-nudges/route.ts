import { NextResponse, type NextRequest } from 'next/server'
import { isWhatsAppFeatureEnabled } from '@/lib/whatsapp/feature-flag'
import { createServiceClient } from '@/lib/supabase/service'
import { classifyMealWindow, loadUserContext } from '@/lib/whatsapp/context'
import { generateNudge } from '@/lib/whatsapp/agent'
import { buildDecision, lastNudgeColumn, pickSlot } from '@/lib/whatsapp/nudge-templates'
import { dispatchOutbound } from '@/lib/whatsapp/dispatch'
import type { WhatsAppConnection } from '@/lib/whatsapp/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface RunResult {
  user_id: string
  slot?: string
  outcome: 'sent' | 'skipped' | 'error'
  reason?: string
}

function localHourFor(timezone: string, when: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  })
  // formatToParts → "23" or "00".
  const value = fmt.format(when)
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : new Date().getHours()
}

export async function GET(request: NextRequest) {
  if (!isWhatsAppFeatureEnabled()) {
    return NextResponse.json({ ok: false, reason: 'feature_disabled' }, { status: 503 })
  }

  // Vercel cron sends `Authorization: Bearer <CRON_SECRET>`.
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
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const results: RunResult[] = []

  for (const row of rows ?? []) {
    const conn = row as WhatsAppConnection
    try {
      const localHour = localHourFor(conn.timezone, now)
      // Quick reject before loading context: only the eligible hours need data.
      if (![11, 18, 21].includes(localHour)) {
        continue
      }

      const ctx = await loadUserContext({
        supabase,
        userId: conn.user_id,
        timezone: conn.timezone,
        locale: 'pt',
      })

      // ctx.localHour comes from the same conversion; sanity-check.
      void classifyMealWindow(ctx.localHour)

      const slot = pickSlot({ ctx, conn, localHour: ctx.localHour })
      if (!slot) {
        results.push({ user_id: conn.user_id, outcome: 'skipped', reason: 'no_slot' })
        continue
      }

      const decision = buildDecision(ctx, slot)

      // Z-API sends free-form text any time — no service window, no template.
      // Always try the LLM for personalized copy, fall back to deterministic text.
      let messageText = decision.fallbackText
      let usage: Record<string, unknown> | undefined
      try {
        const out = await generateNudge(ctx, slot)
        if (out.text) messageText = out.text
        usage = out.usage
      } catch (err) {
        console.error('[cron-nudges] LLM failed, using fallback', err)
        usage = { error: String(err) }
      }

      const dispatched = await dispatchOutbound({
        supabase,
        conn,
        content: messageText,
        source: `cron_nudge_${slot}`,
        metadata: { slot, usage },
      })

      if (!dispatched.ok) {
        results.push({ user_id: conn.user_id, slot, outcome: 'error', reason: dispatched.error })
        continue
      }

      const lastCol = lastNudgeColumn(slot)
      if (lastCol) {
        await supabase
          .from('whatsapp_connections')
          .update({ [lastCol]: now.toISOString() })
          .eq('user_id', conn.user_id)
      }

      results.push({ user_id: conn.user_id, slot, outcome: 'sent' })
    } catch (err) {
      console.error('[cron-nudges] user failed', conn.user_id, err)
      results.push({ user_id: conn.user_id, outcome: 'error', reason: String(err) })
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
