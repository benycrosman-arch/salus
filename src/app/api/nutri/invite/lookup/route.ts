import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Public lookup for an invite token. Used by /aceitar-convite to show the
 * patient who invited them before they create an account. Service-role since
 * the caller is unauthenticated; only returns minimal non-sensitive info.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim()
  // Tokens are 64-char hex (gen_random_bytes(32)) — anything else is malformed.
  if (!token || token.length !== 64 || !/^[0-9a-f]+$/i.test(token)) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Convites não configurados.' }, { status: 503 })
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data: invite, error } = await admin
    .from('nutri_invites')
    .select('id, nutri_id, patient_email, status, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!invite) return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 })

  const expired = new Date(invite.expires_at) < new Date()
  const status = expired && invite.status === 'pending' ? 'expired' : invite.status

  // Only the nutri's display name is exposed publicly. Their email is
  // intentionally withheld — a token holder doesn't need it to accept.
  const { data: nutri } = await admin
    .from('profiles')
    .select('name')
    .eq('id', invite.nutri_id)
    .maybeSingle()

  return NextResponse.json({
    ok: true,
    invite: {
      patient_email: invite.patient_email,
      status,
      expires_at: invite.expires_at,
    },
    nutri: {
      name: nutri?.name ?? '',
    },
  })
}
