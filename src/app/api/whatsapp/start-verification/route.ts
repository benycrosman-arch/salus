import { NextResponse, type NextRequest } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import { isWhatsAppFeatureEnabled } from '@/lib/whatsapp/feature-flag'
import { getProStatus } from '@/lib/pro'
import { normalizeE164 } from '@/lib/whatsapp/phone'
import { generateCode, hashCode } from '@/lib/whatsapp/otp'
import { sendText } from '@/lib/zapi/client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isWhatsAppFeatureEnabled()) {
    return NextResponse.json({ error: 'feature_disabled' }, { status: 503 })
  }

  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const body = await request.json().catch(() => null)
  const phoneRaw = typeof body?.phone === 'string' ? body.phone : null
  const timezone = typeof body?.timezone === 'string' ? body.timezone : 'America/Sao_Paulo'
  if (!phoneRaw) return NextResponse.json({ error: 'phone_required' }, { status: 400 })

  const phone = normalizeE164(phoneRaw)
  if (!phone) return NextResponse.json({ error: 'phone_invalid' }, { status: 400 })

  // Pro gate.
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, plan, subscription_status, subscription_expires_at, role, created_at')
    .eq('id', user.id)
    .maybeSingle()
  const pro = getProStatus(profile)
  if (!pro.isPro) return NextResponse.json({ error: 'pro_required' }, { status: 402 })

  const code = generateCode()
  const codeHash = hashCode(code)

  // Upsert connection in pending state.
  const { error: upsertErr } = await supabase.from('whatsapp_connections').upsert(
    {
      user_id: user.id,
      phone_e164: phone,
      status: 'pending',
      verification_code_hash: codeHash,
      verification_sent_at: new Date().toISOString(),
      verification_attempts: 0,
      timezone,
    },
    { onConflict: 'user_id' },
  )
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  // Z-API has no template approval — just send the code as plain text.
  const sent = await sendText({
    phoneE164: phone,
    message: `Seu código Salus é ${code}. Não compartilhe.`,
  })
  if (!sent.ok) {
    return NextResponse.json({ error: sent.error ?? 'send_failed' }, { status: 502 })
  }

  // In mock mode the dev needs the code surfaced. Never expose in production.
  const debugCode = sent.mocked ? code : undefined
  return NextResponse.json({ ok: true, mocked: sent.mocked, debugCode })
}
