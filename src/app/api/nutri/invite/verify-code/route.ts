import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getInviteByToken, recordCodeAttempt } from '@/lib/nutri-invites'
import { hashCode, normalizeCode, verifyCodeHash, MAX_CODE_ATTEMPTS } from '@/lib/invite-codes'

/**
 * Pre-auth code verification for the public /aceitar-convite landing.
 *
 * The patient lands with the URL token but no session; they enter the
 * 6-char code their nutri shared via a different channel. On success we
 * persist {token, code} in the httpOnly `salus_invite` cookie so the rest
 * of the flow (signup → /auth/callback → /api/nutri/invite/accept) can
 * consume it without exposing the code in JS or URLs.
 *
 * Service-role since the caller is unauthenticated. Wrong attempts
 * increment the same code_attempts counter the accept route uses, so
 * brute-forcing across both surfaces shares one budget.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { token?: string; code?: string }
    | null

  const token = (body?.token ?? '').trim()
  if (!token || token.length !== 64 || !/^[0-9a-f]+$/i.test(token)) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })
  }
  const normalizedCode = normalizeCode(body?.code)
  if (!normalizedCode) {
    return NextResponse.json(
      { error: 'Código de acesso obrigatório (6 caracteres).', code: 'code_required' },
      { status: 400 },
    )
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Convites não configurados.' }, { status: 503 })
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data: invite } = await getInviteByToken(admin, token)
  if (!invite) return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 })
  if (invite.status === 'accepted') {
    return NextResponse.json({ error: 'Convite já aceito.', code: 'already_accepted' }, { status: 410 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    await admin.from('nutri_invites').update({ status: 'expired' }).eq('id', invite.id)
    return NextResponse.json({ error: 'Convite expirado.' }, { status: 410 })
  }

  // Legacy invite without a code_hash → no verification possible. Fall
  // through and just persist the token in the cookie so the rest of the
  // flow continues (the accept route also grandfathers code-less invites).
  if (invite.code_hash) {
    const attempts = invite.code_attempts ?? 0
    if (attempts >= MAX_CODE_ATTEMPTS) {
      await admin.from('nutri_invites').update({ status: 'expired' }).eq('id', invite.id)
      return NextResponse.json(
        { error: 'Muitas tentativas erradas. O convite foi bloqueado.', code: 'code_locked' },
        { status: 423 },
      )
    }
    const expected = invite.code_hash
    const actual = hashCode(invite.id, normalizedCode)
    if (!verifyCodeHash(expected, actual)) {
      const newCount = attempts + 1
      await recordCodeAttempt(admin, invite.id, newCount, newCount >= MAX_CODE_ATTEMPTS)
      const remaining = Math.max(0, MAX_CODE_ATTEMPTS - newCount)
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Código incorreto. Você tem mais ${remaining} tentativa${remaining === 1 ? '' : 's'}.`
              : 'Código incorreto. Convite bloqueado — peça um novo ao seu nutricionista.',
          code: 'code_invalid',
          remaining,
        },
        { status: 401 },
      )
    }
  }

  const cookieValue = JSON.stringify({ token, code: normalizedCode })
  const res = NextResponse.json({
    ok: true,
    patient_email: invite.patient_email,
  })
  res.cookies.set('salus_invite', cookieValue, {
    maxAge: 60 * 60 * 24,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
