import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getInviteByToken, recordCodeAttempt } from '@/lib/nutri-invites'
import { hashCode, normalizeCode, verifyCodeHash, MAX_CODE_ATTEMPTS } from '@/lib/invite-codes'

/**
 * Consume an invite token + access code.
 *
 * Inputs (in priority order):
 *   - body.token / body.code
 *   - `salus_invite` cookie (JSON `{token, code}` for new invites; legacy
 *     plain-string token for invites issued before migration 029)
 *
 * Auth required: the calling user becomes the patient. Creates a
 * nutri_patient_links row (or reactivates an existing one) and marks the
 * invite as accepted. Idempotent — safe to call twice.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) =>
          s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | { token?: string; code?: string }
    | null

  const cookieRaw = cookieStore.get('salus_invite')?.value || ''
  const cookieParsed = parseInviteCookie(cookieRaw)

  const token = (body?.token || cookieParsed.token || '').trim()
  const rawCode = body?.code || cookieParsed.code || ''
  if (!token) {
    return NextResponse.json({ error: 'Token ausente.' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Convites não configurados.' }, { status: 503 })
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data: invite } = await getInviteByToken(admin, token)

  if (!invite) return NextResponse.json({ error: 'Convite inválido.' }, { status: 404 })
  if (new Date(invite.expires_at) < new Date()) {
    await admin.from('nutri_invites').update({ status: 'expired' }).eq('id', invite.id)
    return NextResponse.json({ error: 'Convite expirado.' }, { status: 410 })
  }

  if (invite.nutri_id === user.id) {
    return NextResponse.json({ error: 'Você não pode aceitar seu próprio convite.' }, { status: 400 })
  }

  if (
    invite.patient_email.trim().toLowerCase() !==
    (user.email ?? '').trim().toLowerCase()
  ) {
    return NextResponse.json(
      {
        error: 'Este convite foi enviado para outro e-mail. Faça login com a conta correta para aceitar.',
        code: 'email_mismatch',
        invited_email: invite.patient_email,
      },
      { status: 403 },
    )
  }

  // Code verification — required for any invite that has a code_hash (i.e.
  // issued after migration 029). Legacy invites without a hash are
  // grandfathered to keep pre-existing pending links acceptable.
  if (invite.code_hash) {
    const attempts = invite.code_attempts ?? 0
    if (attempts >= MAX_CODE_ATTEMPTS) {
      await admin.from('nutri_invites').update({ status: 'expired' }).eq('id', invite.id)
      return NextResponse.json(
        { error: 'Muitas tentativas erradas. O convite foi bloqueado — peça um novo.', code: 'code_locked' },
        { status: 423 },
      )
    }
    const normalized = normalizeCode(rawCode)
    if (!normalized) {
      return NextResponse.json(
        { error: 'Código de acesso obrigatório (6 caracteres).', code: 'code_required' },
        { status: 400 },
      )
    }
    const expected = invite.code_hash
    const actual = hashCode(invite.id, normalized)
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

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role === 'nutricionista') {
    return NextResponse.json(
      { error: 'Esta conta é de nutricionista. Use uma conta de paciente para aceitar o convite.' },
      { status: 409 },
    )
  }

  const { error: linkErr } = await admin
    .from('nutri_patient_links')
    .upsert(
      {
        nutri_id: invite.nutri_id,
        patient_id: user.id,
        status: 'active',
      },
      { onConflict: 'nutri_id,patient_id' },
    )
  if (linkErr) {
    console.error('invite accept link error:', linkErr)
    return NextResponse.json({ error: 'Falha ao vincular ao nutricionista.' }, { status: 500 })
  }

  await admin.from('nutri_invites').update({ status: 'accepted' }).eq('id', invite.id)

  cookieStore.set('salus_invite', '', { maxAge: 0, path: '/' })

  return NextResponse.json({ ok: true, nutri_id: invite.nutri_id })
}

function parseInviteCookie(raw: string): { token: string; code: string } {
  if (!raw) return { token: '', code: '' }
  // New cookies are JSON; legacy cookies are bare token strings.
  if (raw.startsWith('{')) {
    try {
      const j = JSON.parse(raw) as { token?: unknown; code?: unknown }
      return {
        token: typeof j.token === 'string' ? j.token : '',
        code: typeof j.code === 'string' ? j.code : '',
      }
    } catch {
      return { token: '', code: '' }
    }
  }
  return { token: raw, code: '' }
}
