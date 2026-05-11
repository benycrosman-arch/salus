import { NextResponse, type NextRequest } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import { isWhatsAppFeatureEnabled } from '@/lib/whatsapp/feature-flag'
import { verifyCode } from '@/lib/whatsapp/otp'

export const dynamic = 'force-dynamic'

const MAX_ATTEMPTS = 5
const CODE_TTL_MS = 10 * 60 * 1000

export async function POST(request: NextRequest) {
  if (!isWhatsAppFeatureEnabled()) {
    return NextResponse.json({ error: 'feature_disabled' }, { status: 503 })
  }

  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const body = await request.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim() : null
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'code_invalid' }, { status: 400 })
  }

  const { data: conn, error } = await supabase
    .from('whatsapp_connections')
    .select(
      'user_id, status, verification_code_hash, verification_sent_at, verification_attempts',
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!conn) return NextResponse.json({ error: 'no_pending_verification' }, { status: 404 })
  if (conn.status === 'verified') return NextResponse.json({ ok: true, alreadyVerified: true })

  if ((conn.verification_attempts ?? 0) >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 })
  }

  const sentAt = conn.verification_sent_at ? new Date(conn.verification_sent_at).getTime() : 0
  if (!sentAt || Date.now() - sentAt > CODE_TTL_MS) {
    return NextResponse.json({ error: 'code_expired' }, { status: 410 })
  }

  if (!verifyCode(code, conn.verification_code_hash ?? null)) {
    await supabase
      .from('whatsapp_connections')
      .update({ verification_attempts: (conn.verification_attempts ?? 0) + 1 })
      .eq('user_id', user.id)
    return NextResponse.json({ error: 'code_mismatch' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('whatsapp_connections')
    .update({
      status: 'verified',
      verified_at: now,
      opt_in_at: now,
      verification_code_hash: null,
      verification_attempts: 0,
      last_message_at: now, // opens the 24h service window
    })
    .eq('user_id', user.id)

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
