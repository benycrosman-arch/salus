import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import { sendEmail, nutriInviteEmail } from '@/lib/email'
import { normalizeE164 } from '@/lib/whatsapp/phone'

/**
 * Create an invite. Persists in nutri_invites and dispatches an email via
 * Resend when configured. The returned `link` lands the patient on the public
 * /aceitar-convite page, which shows the nutri's name and routes to signup
 * with the invite token persisted (auto-linking on signup completion).
 *
 * If `phone` is provided, also returns a `waMeUrl` (https://wa.me/...) the
 * client opens to dispatch the invite as a WhatsApp message — Brazilian-market
 * channel, replaces the email click-through where the nutri already has the
 * patient's number.
 */
export async function POST(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const body = (await request.json().catch(() => null)) as
    | { email?: string; phone?: string }
    | null
  const email = String(body?.email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
  }

  // Phone is optional. When provided we normalize to E.164; bad phones are a
  // 400 (don't silently drop — better to tell the nutri).
  let phoneE164: string | null = null
  const rawPhone = String(body?.phone ?? '').trim()
  if (rawPhone.length > 0) {
    phoneE164 = normalizeE164(rawPhone)
    if (!phoneE164) {
      return NextResponse.json(
        { error: 'Telefone inválido. Use o formato (XX) 9XXXX-XXXX.' },
        { status: 400 },
      )
    }
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
    .insert({
      nutri_id: user.id,
      patient_email: email,
      patient_phone: phoneE164,
    })
    .select('id, token, patient_email, patient_phone, expires_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin
  const link = `${baseUrl}/aceitar-convite?token=${invite.token}`

  const nutriName = profile?.name || user.email?.split('@')[0] || 'Seu nutricionista'

  // Build the wa.me deep link. Strip the leading + because wa.me wants raw digits.
  let waMeUrl: string | null = null
  if (phoneE164) {
    const digits = phoneE164.replace(/\D/g, '')
    const message =
      `Oi! ${nutriName} te convidou pra usar o Salus — fotografe seus pratos e ele(a) ` +
      `acompanha tudo direto no painel.\n\n` +
      `Aceite com o e-mail ${email}: ${link}`
    waMeUrl = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
  }

  // Email is best-effort. Skip when the nutri is going to dispatch via WhatsApp
  // and explicitly requested no email — but keeping the existing default of
  // also emailing keeps the invite recoverable if the WA tap is missed.
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
    waMeUrl,
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
