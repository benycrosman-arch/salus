import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import { sendEmail, nutriInviteEmail } from '@/lib/email'

/**
 * Create an invite. Persists in nutri_invites and dispatches an email via
 * Resend when configured. The returned `link` lands the patient on the public
 * /aceitar-convite page, which shows the nutri's name and routes to signup
 * with the invite token persisted (auto-linking on signup completion).
 */
export async function POST(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const body = (await request.json().catch(() => null)) as { email?: string } | null
  const email = String(body?.email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'nutricionista') {
    return NextResponse.json({ error: 'Apenas nutricionistas podem convidar.' }, { status: 403 })
  }

  const { data: invite, error } = await supabase
    .from('nutri_invites')
    .insert({ nutri_id: user.id, patient_email: email })
    .select('id, token, patient_email, expires_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin
  const link = `${baseUrl}/aceitar-convite?token=${invite.token}`

  const nutriName = profile?.name || user.email?.split('@')[0] || 'Seu nutricionista'
  const { subject, html } = nutriInviteEmail({
    nutriName,
    patientEmail: invite.patient_email,
    link,
  })
  const send = await sendEmail({
    to: invite.patient_email,
    subject,
    html,
    replyTo: user.email ?? undefined,
  })

  return NextResponse.json({
    ok: true,
    invite,
    link,
    emailSent: send.ok,
    emailReason: send.ok ? null : send.reason,
  })
}

export async function GET() {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const { data, error } = await supabase
    .from('nutri_invites')
    .select('id, patient_email, status, created_at, expires_at')
    .eq('nutri_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invites: data ?? [] })
}
