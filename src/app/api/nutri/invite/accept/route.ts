import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getInviteByToken } from '@/lib/nutri-invites'

/**
 * Consume an invite token. Auth required: the calling user becomes the patient.
 * Creates a nutri_patient_links row (or reactivates an existing one) and marks
 * the invite as accepted. Idempotent — safe to call twice.
 *
 * Token can come from POST body or `salus_invite` cookie (set when the user
 * first lands on /aceitar-convite). The cookie path lets us auto-link after
 * signup without bouncing through extra pages.
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

  const body = (await request.json().catch(() => null)) as { token?: string } | null
  const token = (body?.token || cookieStore.get('salus_invite')?.value || '').trim()
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

  // Patient must not be the inviting nutri
  if (invite.nutri_id === user.id) {
    return NextResponse.json({ error: 'Você não pode aceitar seu próprio convite.' }, { status: 400 })
  }

  // The token is only valid for the email it was issued to. Anyone else
  // bouncing the link (or signing up with a different address) is rejected.
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

  // Patients only — the nutri panel is incompatible with patient role
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

  // Upsert link (active). The unique constraint is (nutri_id, patient_id).
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

  // Burn the cookie so we don't try to re-accept on subsequent loads
  cookieStore.set('salus_invite', '', { maxAge: 0, path: '/' })

  return NextResponse.json({ ok: true, nutri_id: invite.nutri_id })
}
