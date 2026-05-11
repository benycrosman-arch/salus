import { NextResponse, type NextRequest } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import { isWhatsAppFeatureEnabled } from '@/lib/whatsapp/feature-flag'
import { createServiceClient } from '@/lib/supabase/service'
import { loadUserContext } from '@/lib/whatsapp/context'
import { generateReply, generateNudge } from '@/lib/whatsapp/agent'
import { buildDecision } from '@/lib/whatsapp/nudge-templates'
import type { WhatsAppConnection } from '@/lib/whatsapp/types'

export const dynamic = 'force-dynamic'

/**
 * Dev-only convenience. Lets a Pro user trigger the agent end-to-end without
 * sending real WhatsApp traffic. Returns the generated text directly.
 *
 * Body:
 *   { mode: 'reply', text: string }
 *   { mode: 'nudge', slot: 'lunch'|'dinner'|'recap'|'hydration' }
 */
export async function POST(request: NextRequest) {
  if (!isWhatsAppFeatureEnabled()) {
    return NextResponse.json({ error: 'feature_disabled' }, { status: 503 })
  }
  if (process.env.NODE_ENV === 'production' && !process.env.WHATSAPP_DEV_TOOLS_ENABLED) {
    return NextResponse.json({ error: 'dev_only' }, { status: 404 })
  }

  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user } = guard

  const body = await request.json().catch(() => null)
  const mode: 'reply' | 'nudge' = body?.mode === 'nudge' ? 'nudge' : 'reply'

  const service = createServiceClient()
  const { data: connRow } = await service
    .from('whatsapp_connections')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  const conn = (connRow as WhatsAppConnection | null) ?? null

  const ctx = await loadUserContext({
    supabase: service,
    userId: user.id,
    timezone: conn?.timezone ?? 'America/Sao_Paulo',
    locale: 'pt',
  })

  if (mode === 'reply') {
    const text = typeof body?.text === 'string' ? body.text : 'oi, como tô indo hoje?'
    try {
      const out = await generateReply(ctx, text)
      return NextResponse.json({ ok: true, mode, reply: out.text, usage: out.usage })
    } catch (err) {
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
    }
  }

  const slot: 'lunch' | 'dinner' | 'recap' | 'hydration' =
    body?.slot === 'dinner' ? 'dinner' : body?.slot === 'recap' ? 'recap' : body?.slot === 'hydration' ? 'hydration' : 'lunch'

  const decision = buildDecision(ctx, slot)

  try {
    const out = await generateNudge(ctx, slot)
    return NextResponse.json({
      ok: true,
      mode,
      slot,
      llmText: out?.text ?? null,
      fallbackText: decision.fallbackText,
      usage: out?.usage,
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err), fallbackText: decision.fallbackText }, { status: 500 })
  }
}
