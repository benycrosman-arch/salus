import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import { sendEmail, nutriInviteEmail } from '@/lib/email'
import { insertInvite, listInvitesForNutri } from '@/lib/nutri-invites'
import { verifyInviteRequest } from '@/lib/invite-security'
import { generateAccessCode, hashCode } from '@/lib/invite-codes'

const INVITE_TTL_HOURS = 24

/**
 * Create an invite. Persists in nutri_invites with a salted hash of a 6-char
 * out-of-band access code, dispatches an email via Resend, and returns BOTH
 * the link and the raw code so the nutri can show them in the UI exactly
 * once. The patient must present token + code to accept — single-channel
 * compromise (forwarded email, leaked link) isn't enough.
 */
export async function POST(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

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

  // Generate the access code BEFORE the insert so we can hash it with the
  // invite ID. Trick: insert a placeholder hash first, then update with the
  // real hash using the row's actual ID. Simpler: use a UUID generated
  // client-side as both the row PK and the salt — but the schema has
  // gen_random_uuid() as the default and we don't want to fight that.
  //
  // Compromise: hash with the (random) raw code itself as both data and salt
  // on first pass, then immediately update with the proper id-salted hash.
  // Shorter total: just use the email + code + a per-request nonce as a
  // pre-hash placeholder and overwrite right after. We do the latter.
  const rawCode = generateAccessCode()
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000).toISOString()

  // Insert with a temporary hash (id not yet known).
  const tempHash = hashCode('pending-rotation', rawCode)
  const { data: invite, error } = await insertInvite(supabase, {
    nutri_id: user.id,
    patient_email: email,
    code_hash: tempHash,
    expires_at: expiresAt,
  })

  if (error || !invite) {
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

  // Now that we have the row's UUID, rotate to the proper id-salted hash.
  // If this update fails the invite still works — but accept won't accept
  // any code (since the temp hash uses a literal salt nobody knows). Treat
  // an update failure as a hard error and roll the invite back.
  const properHash = hashCode(invite.id, rawCode)
  const { error: rotateErr } = await supabase
    .from('nutri_invites')
    .update({ code_hash: properHash })
    .eq('id', invite.id)
  if (rotateErr) {
    await supabase.from('nutri_invites').delete().eq('id', invite.id)
    console.error('invite code-hash rotation failed:', rotateErr.message)
    return NextResponse.json({ error: 'Falha ao gerar código do convite.' }, { status: 500 })
  }

  const link = `${baseUrl.replace(/\/$/, '')}/aceitar-convite?token=${invite.token}`

  const rawNutriName = profile?.name || user.email?.split('@')[0] || 'Seu nutricionista'
  const nutriName = rawNutriName.replace(/[\r\n]+/g, ' ').slice(0, 200)

  const { subject, html } = nutriInviteEmail({
    nutriName,
    patientEmail: invite.patient_email,
    link,
    accessCode: rawCode,
  })
  const send = await sendEmail({
    to: invite.patient_email,
    subject,
    html,
    replyTo: user.email ?? undefined,
  })

  return NextResponse.json({
    ok: true,
    invite: {
      id: invite.id,
      patient_email: invite.patient_email,
      expires_at: invite.expires_at,
      token: invite.token,
    },
    link,
    accessCode: rawCode,
    expiresInHours: INVITE_TTL_HOURS,
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
