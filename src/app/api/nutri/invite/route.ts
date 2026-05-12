import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import { sendEmail, nutriInviteEmail } from '@/lib/email'
import { insertInvite, listInvitesForNutri } from '@/lib/nutri-invites'
import { verifyInviteRequest } from '@/lib/invite-security'

/**
 * Create an invite. Persists in nutri_invites and dispatches an email via
 * Resend. The returned `link` lands the patient on the public /aceitar-convite
 * page, which shows the nutri's name and routes to signup with the invite
 * token persisted (auto-linking on signup completion).
 */
export async function POST(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  // The invite link is dispatched in an email — using request.nextUrl.origin
  // (Host header) as a fallback would let an attacker who can hit this API
  // mint phishing links pointing at attacker.com under our `convites@`
  // sender. Refuse to issue an invite if the prod URL isn't configured.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
    console.error('NEXT_PUBLIC_APP_URL not set; refusing to mint invite link.')
    return NextResponse.json(
      { error: 'Convites temporariamente indisponíveis.' },
      { status: 503 },
    )
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'nutricionista') {
    return NextResponse.json({ error: 'Apenas nutricionistas podem convidar.' }, { status: 403 })
  }

  const verdict = await verifyInviteRequest({
    supabase,
    nutriId: user.id,
    nutriOwnEmail: user.email ?? null,
    rawEmail: body?.email,
  })
  if (!verdict.ok) {
    return NextResponse.json(
      { error: verdict.error, code: verdict.code },
      { status: verdict.status },
    )
  }
  const email = verdict.normalizedEmail

  const { data: invite, error } = await insertInvite(supabase, {
    nutri_id: user.id,
    patient_email: email,
  })

  if (error || !invite) {
    // 23505 = unique_violation from the partial index added in migration 028.
    // Means another concurrent request beat us to the duplicate-pending guard.
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'Já existe um convite pendente para este e-mail.', code: 'duplicate_pending' },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: error?.message || 'Falha ao criar convite.' },
      { status: 500 },
    )
  }

  const link = `${baseUrl.replace(/\/$/, '')}/aceitar-convite?token=${invite.token}`

  // Strip CR/LF from the display name — it ends up in the email Subject and a
  // newline there could be interpreted as a header boundary by some relays.
  const rawNutriName = profile?.name || user.email?.split('@')[0] || 'Seu nutricionista'
  const nutriName = rawNutriName.replace(/[\r\n]+/g, ' ').slice(0, 200)

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

  const { data, error } = await listInvitesForNutri(supabase, user.id, 50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invites: data })
}
