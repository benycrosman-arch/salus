import { cookies } from 'next/headers'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Stethoscope, CheckCircle, AlertCircle } from 'lucide-react'
import { getInviteByToken } from '@/lib/nutri-invites'
import { CodeEntryForm } from './code-entry-form'

export const dynamic = 'force-dynamic'

type Search = { token?: string }

/**
 * Public landing for an invite link.
 *
 * Flow:
 *   1. Look up the token (server-side, service role) → confirm it's pending
 *   2. Show the nutri's name + a 6-char code entry form
 *   3. Form posts to /api/nutri/invite/verify-code; on success the server
 *      sets the httpOnly `salus_invite` cookie with {token, code}
 *   4. Client redirects to /auth/signup (or /aceitar-convite/confirmar if
 *      already logged in)
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
    .select('name')
    .eq('id', invite.nutri_id)
    .maybeSingle()

  // Detect whether the visitor is already authenticated. Used purely to
  // decide where to redirect after a successful code verification — we do
  // NOT plant the cookie here anymore. The verify-code endpoint sets it
  // only after the patient proves they have the access code.
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
          <h1 className="font-serif text-2xl italic text-[#1a3a2a] leading-tight">
            <span className="not-italic font-semibold">{nutriName}</span> te convidou para a Salus
          </h1>
          <p className="text-sm text-[#1a3a2a]/60 mt-2 leading-relaxed">
            Enviamos um código de 6 caracteres para o seu e-mail.
            Verifique sua caixa de entrada (e a pasta de spam) e digite ele aqui.
          </p>

          <CodeEntryForm
            token={token}
            invitedEmail={invite.patient_email}
            isLoggedIn={!!user}
          />
        </div>

        <p className="text-center text-[11px] text-[#1a3a2a]/40 mt-5 leading-relaxed">
          Ao aceitar, {nutriName} terá acesso aos seus dados de nutrição, exames e progresso.
          Você pode encerrar o vínculo a qualquer momento em Configurações.
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
