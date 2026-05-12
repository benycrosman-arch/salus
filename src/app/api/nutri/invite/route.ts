import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import { sendEmail, nutriInviteEmail } from '@/lib/email'
import { listInvitesForNutri } from '@/lib/nutri-invites'
import { generateAccessCode } from '@/lib/invite-codes'

const INVITE_TTL_HOURS = 24

/**
 * Create an invite via the create_invitation RPC (migration 033).
 *
 * The route stays thin: generate a 6-char access code, hand it + email
 * to the RPC. The RPC runs cap-check, dup-check, and the salted-hash
 * insert in a single transaction with row locks — closing the TOCTOU
 * windows that existed when those checks lived in JS.
 *
 * Raw code is shown to the nutri exactly once in the response and
 * dispatched in the email body NEVER (the email mentions a code is
 * required so the patient knows to ask).
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
  const email = typeof body?.email === 'string' ? body.email : ''

  const rawCode = generateAccessCode()

  type RpcResp =
    | {
        ok: true
        invite: { id: string; token: string; patient_email: string; expires_at: string }
        nutri_name: string
      }
    | {
        ok: false
        code:
          | 'invalid_email'
          | 'invalid_code'
          | 'self_invite'
          | 'hourly_cap'
          | 'daily_cap'
          | 'duplicate_pending'
        error: string
      }

  const { data, error } = await supabase.rpc('create_invitation', {
    p_patient_email: email,
    p_raw_code: rawCode,
    p_expires_in_hours: INVITE_TTL_HOURS,
  })

  if (error) {
    // The RPC raises only for unauthorized / forbidden — everything else
    // comes back in the jsonb envelope.
    if (error.message.includes('forbidden')) {
      return NextResponse.json(
        { error: 'Apenas nutricionistas podem convidar.' },
        { status: 403 },
      )
    }
    if (error.message.includes('unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('create_invitation RPC failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const resp = data as RpcResp
  if (!resp.ok) {
    const status =
      resp.code === 'duplicate_pending'
        ? 409
        : resp.code === 'hourly_cap' || resp.code === 'daily_cap'
          ? 429
          : 400
    return NextResponse.json({ error: resp.error, code: resp.code }, { status })
  }

  const invite = resp.invite
  const link = `${baseUrl.replace(/\/$/, '')}/aceitar-convite?token=${invite.token}`

  const rawNutriName = resp.nutri_name || user.email?.split('@')[0] || 'Seu nutricionista'
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
    invite,
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
