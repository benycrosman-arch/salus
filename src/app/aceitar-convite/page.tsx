import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Stethoscope, ArrowRight, CheckCircle, AlertCircle, Mail } from 'lucide-react'
import { getInviteByToken } from '@/lib/nutri-invites'

export const dynamic = 'force-dynamic'

type Search = { token?: string }

/**
 * Public landing for an invite link emailed by a nutricionista.
 *
 * Flow:
 *   1. Look up the token (server-side, service role) → nutri name + status
 *   2. Persist the token in `salus_invite` cookie (1 day)
 *   3. If the visitor is already authenticated, push them straight through
 *      `/api/nutri/invite/accept` via the nutri-link redirector below
 *   4. Otherwise, route to /auth/signup?email=... — the auth callback will
 *      consume the cookie post-signup and create the link automatically.
 */
export default async function AceitarConvitePage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const sp = await searchParams
  const token = sp.token?.trim()

  if (!token) {
    return <InvalidScreen reason="missing" />
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return <InvalidScreen reason="not_configured" />
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data: invite } = await getInviteByToken(admin, token)

  if (!invite) return <InvalidScreen reason="not_found" />
  if (invite.status === 'accepted') return <AlreadyAccepted />
  const expired = new Date(invite.expires_at) < new Date()
  if (expired) return <InvalidScreen reason="expired" />

  const { data: nutri } = await admin
    .from('profiles')
    .select('name, email')
    .eq('id', invite.nutri_id)
    .maybeSingle()

  // Auth-check FIRST so we can decide whether to persist the cookie. If a
  // logged-in visitor with the wrong email lands on an attacker's link, we
  // don't want their session to silently inherit the attacker's token in the
  // httpOnly cookie — accept's email_mismatch gate would catch it, but the
  // safer move is to never persist the cookie unless it could plausibly help.
  const cookieStore = await cookies()
  const userSupabase = createServerClient(
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
  const {
    data: { user },
  } = await userSupabase.auth.getUser()

  const sessionEmail = user?.email?.trim().toLowerCase() ?? null
  const invitedEmail = invite.patient_email.trim().toLowerCase()
  const matchesSession = !user || sessionEmail === invitedEmail

  if (matchesSession) {
    cookieStore.set('salus_invite', token, {
      maxAge: 60 * 60 * 24,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  if (user) {
    // Logged in — bounce to the confirmation screen. If the email doesn't
    // match, /api/nutri/invite/accept will surface 403 email_mismatch and the
    // confirmar UI shows a "trocar de conta" path.
    redirect('/aceitar-convite/confirmar')
  }

  const nutriName = nutri?.name?.trim() || 'Seu nutricionista'

  return (
    <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1a3a2a] flex items-center justify-center text-white font-bold">
              S
            </div>
            <span className="font-serif italic text-2xl text-[#1a3a2a]">Salus</span>
          </div>
        </div>

        <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-8">
          <div className="w-12 h-12 rounded-2xl bg-[#1a3a2a]/10 flex items-center justify-center mb-5">
            <Stethoscope className="w-5 h-5 text-[#1a3a2a]" />
          </div>
          <h1 className="font-serif text-3xl italic text-[#1a3a2a] leading-tight">
            Seu nutricionista <span className="not-italic font-semibold">{nutriName}</span> convidou
            você para usar a Salus AI
          </h1>
          <p className="text-sm text-[#1a3a2a]/60 mt-3 leading-relaxed">
            A Salus é o app que {nutriName} usa para acompanhar suas refeições, exames e progresso
            entre as consultas. Você fotografa o prato, a IA analisa, e seu nutricionista vê tudo no
            painel dele(a).
          </p>

          <div className="mt-6 rounded-2xl bg-[#faf8f4] p-4 flex items-center gap-3">
            <Mail className="w-4 h-4 text-[#1a3a2a]/50" />
            <div className="text-xs text-[#1a3a2a]/70 font-body">
              Convite enviado para{' '}
              <span className="font-medium text-[#1a3a2a]">{invite.patient_email}</span>
            </div>
          </div>

          <Link href={`/auth/signup?email=${encodeURIComponent(invite.patient_email)}`}>
            <Button className="mt-6 w-full h-12 rounded-full bg-[#1a3a2a] text-white hover:bg-[#1a3a2a]/90">
              Criar conta e aceitar convite
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>

          <p className="text-center text-xs text-[#1a3a2a]/50 mt-4">
            Já tem conta?{' '}
            <Link
              href={`/auth/login?email=${encodeURIComponent(invite.patient_email)}`}
              className="font-semibold text-[#1a3a2a] hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>

        <p className="text-center text-[11px] text-[#1a3a2a]/40 mt-5 leading-relaxed">
          Ao aceitar, {nutriName} terá acesso aos seus dados de nutrição, exames e progresso na
          Salus. Você pode encerrar o vínculo a qualquer momento em Configurações.
        </p>
      </div>
    </div>
  )
}

function InvalidScreen({ reason }: { reason: 'missing' | 'not_found' | 'expired' | 'not_configured' }) {
  const messages: Record<string, string> = {
    missing: 'Link de convite incompleto. Peça ao seu nutricionista para reenviar.',
    not_found: 'Não encontramos esse convite. Talvez o link esteja errado ou tenha sido cancelado.',
    expired: 'Este convite expirou. Peça ao seu nutricionista para enviar um novo.',
    not_configured:
      'Os convites estão temporariamente indisponíveis. Tente novamente em alguns minutos.',
  }
  return (
    <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-[#c4614a]/10 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-[#c4614a]" />
        </div>
        <h1 className="font-serif text-2xl italic text-[#1a3a2a]">Convite indisponível</h1>
        <p className="text-sm text-[#1a3a2a]/60 font-body">{messages[reason]}</p>
        <Link href="/">
          <Button variant="outline" className="rounded-full">
            Voltar ao início
          </Button>
        </Link>
      </div>
    </div>
  )
}

function AlreadyAccepted() {
  return (
    <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-[#4a7c4a]/10 flex items-center justify-center mx-auto">
          <CheckCircle className="w-6 h-6 text-[#4a7c4a]" />
        </div>
        <h1 className="font-serif text-2xl italic text-[#1a3a2a]">Convite já aceito</h1>
        <p className="text-sm text-[#1a3a2a]/60 font-body">
          Você já está vinculado(a) ao seu nutricionista. Entre na sua conta para continuar.
        </p>
        <Link href="/auth/login">
          <Button className="rounded-full bg-[#1a3a2a]">Entrar</Button>
        </Link>
      </div>
    </div>
  )
}
