import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'

type EmailOtpType = 'signup' | 'email' | 'magiclink' | 'recovery' | 'invite' | 'email_change'

/**
 * Auth callback — handles every Supabase auth landing case:
 *
 *   1. OAuth (Google/Apple) → ?code=...
 *   2. Email confirmation (PKCE flow, default in @supabase/ssr) → ?code=...
 *   3. Email confirmation (token_hash flow, custom email template) → ?token_hash=...&type=signup
 *   4. Magic link → ?token_hash=...&type=magiclink
 *   5. Password recovery → ?token_hash=...&type=recovery
 *   6. Failure passthroughs → ?error=...&error_description=...&error_code=...
 *   7. Already-authenticated landings → falls through to profile check
 *
 * IMPORTANT: PKCE email confirmation REQUIRES the same browser/device that
 * initiated signUp (because of the verifier cookie). If users open the email
 * on their phone after signing up on desktop, the exchange fails. Surface
 * the specific reason so we can guide them in the UI.
 */

const ERR_REDIRECT = (origin: string, code: string, msg?: string) =>
  NextResponse.redirect(
    `${origin}/auth/login?error=${encodeURIComponent(code)}${msg ? `&msg=${encodeURIComponent(msg.slice(0, 120))}` : ''}`,
  )

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const typeRaw = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  // Supabase passes errors back via query params when its hosted /auth/v1/verify
  // step fails before redirecting here.
  const errParam = searchParams.get('error')
  const errCodeParam = searchParams.get('error_code')
  const errDescParam = searchParams.get('error_description')

  if (errParam) {
    console.error('Supabase verify failure:', errParam, errCodeParam, errDescParam)
    return ERR_REDIRECT(origin, errCodeParam || errParam, errDescParam || undefined)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  let userId: string | null = null
  let userEmail: string | null = null
  let userMeta: Record<string, unknown> | null = null
  let didAuth = false

  // ── Path A: code exchange (OAuth + PKCE email) ───────────
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      userId = data.user.id
      userEmail = data.user.email ?? null
      userMeta = (data.user.user_metadata ?? null) as Record<string, unknown> | null
      didAuth = true
    } else {
      // Common: PKCE verifier missing (cross-device email click)
      // or code already used (link clicked twice)
      console.error('exchangeCodeForSession failed:', error?.message)
      return ERR_REDIRECT(
        origin,
        'code_exchange_failed',
        error?.message || 'Link inválido ou expirado',
      )
    }
  }

  // ── Path B: token_hash OTP verification ──────────────────
  if (!didAuth && tokenHash && typeRaw) {
    const validTypes: EmailOtpType[] = ['signup', 'email', 'magiclink', 'recovery', 'invite', 'email_change']
    const type = validTypes.includes(typeRaw as EmailOtpType) ? (typeRaw as EmailOtpType) : null
    if (!type) {
      return ERR_REDIRECT(origin, 'invalid_otp_type')
    }
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (error || !data.user) {
      console.error('verifyOtp failed:', error?.message)
      return ERR_REDIRECT(origin, 'otp_invalid', error?.message || 'Token inválido')
    }
    userId = data.user.id
    userEmail = data.user.email ?? null
    userMeta = (data.user.user_metadata ?? null) as Record<string, unknown> | null
    didAuth = true

    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/auth/forgot-password?step=reset`)
    }
  }

  // ── Path C: already authenticated (e.g. user lands here after a manual nav) ──
  if (!didAuth) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
      userEmail = user.email ?? null
      userMeta = (user.user_metadata ?? null) as Record<string, unknown> | null
      didAuth = true
    }
  }

  if (!didAuth || !userId) {
    return ERR_REDIRECT(origin, 'no_auth_params', 'Sem code ou token_hash')
  }

  // Role detection: email+senha grava role em user_metadata.role via signUp({data}).
  // OAuth (Google/Apple) não permite isso, então o signup page passa &role= na URL
  // de redirectTo — lemos os dois e nutri ganha se qualquer um indicar.
  const metaRole = typeof userMeta?.role === 'string' ? userMeta.role : null
  const urlRole = searchParams.get('role')
  const desiredRole = (metaRole === 'nutricionista' || urlRole === 'nutricionista')
    ? 'nutricionista'
    : 'user'

  // Safety net: garante que o profile existe (caso o trigger handle_new_user
  // tenha falhado). O role aqui só importa se a row ainda não existir.
  await supabase.from('profiles').upsert(
    {
      id: userId,
      name:
        (typeof userMeta?.name === 'string' && userMeta.name) ||
        (typeof userMeta?.full_name === 'string' && userMeta.full_name) ||
        userEmail?.split('@')[0] ||
        '',
      role: desiredRole,
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  // OAuth: o trigger criou profile com role='user' (raw_user_meta_data do
  // provider não tem role). Aqui usamos service-role pra contornar o
  // guard_profile_admin_columns (migration 011), que reverteria new.role
  // pro old.role num UPDATE feito pelo próprio usuário.
  if (desiredRole === 'nutricionista') {
    const service = createServiceClient()
    await service
      .from('profiles')
      .update({
        role: 'nutricionista',
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', userId)

    // Propaga pro user_metadata se veio só pela URL (OAuth) — alinha a
    // fonte de verdade pra qualquer fluxo futuro que dependa do metadata.
    if (metaRole !== 'nutricionista') {
      await supabase.auth.updateUser({ data: { role: 'nutricionista' } })
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, role')
    .eq('id', userId)
    .single()

  // Consume a pending nutri invite if one is parked in the cookie.
  // Done after auth establishes a session, before any redirect — the link
  // shows up immediately on the patient's dashboard and the nutri's panel.
  // If the auto-link fails (e.g. email mismatch 403), we keep the cookie and
  // bounce the patient to the manual confirmation screen so they see the error
  // instead of silently landing on the dashboard with no link.
  const inviteToken = cookieStore.get('salus_invite')?.value
  let inviteAcceptFailed = false
  if (inviteToken && profile?.role !== 'nutricionista') {
    try {
      const acceptRes = await fetch(`${origin}/api/nutri/invite/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward the auth cookies so the accept endpoint sees the session
          cookie: cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; '),
        },
        body: JSON.stringify({ token: inviteToken }),
      })
      if (!acceptRes.ok) {
        const errBody = await acceptRes.json().catch(() => ({}))
        console.error(
          'invite accept (post-auth) returned',
          acceptRes.status,
          errBody?.code || errBody?.error,
        )
        inviteAcceptFailed = true
      } else {
        // Success — accept endpoint already cleared the cookie, but be explicit.
        cookieStore.set('salus_invite', '', { maxAge: 0, path: '/' })
      }
    } catch (err) {
      console.error('invite accept (post-auth) network error:', err)
      inviteAcceptFailed = true
    }
  }

  // If the auto-link failed, route the patient to /aceitar-convite/confirmar
  // which reads the cookie itself, retries the accept, and surfaces the error.
  if (inviteAcceptFailed) {
    return NextResponse.redirect(`${origin}/aceitar-convite/confirmar`)
  }

  const isNutri = profile?.role === 'nutricionista' || desiredRole === 'nutricionista'

  // Nutri sempre vai pro painel — pulou onboarding intermediário acima.
  // Paciente continua passando pelo quiz quando ainda não completou.
  if (isNutri) {
    // CRN verification gate removido — todo nutri vai direto pro painel.
    return NextResponse.redirect(`${origin}/nutri`)
  }

  if (!profile?.onboarding_completed) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }
  return NextResponse.redirect(`${origin}${next}`)
}
