"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { Eye, EyeOff, Loader2, CheckCircle, User, Stethoscope, ArrowLeft, Check } from "lucide-react"
import { toast } from "sonner"
import { identify, track } from "@/lib/posthog"
import { useTranslations } from "next-intl"
import { LanguageSwitcher } from "@/components/language-switcher"

type Role = "user" | "nutricionista"

function SignUpInner() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()
  const t = useTranslations('auth.signup')
  const tCommon = useTranslations('common')
  const tOauth = useTranslations('auth.oauth')
  const tErrors = useTranslations('auth.errors')
  const tNutri = useTranslations('pricing.nutri')

  const prefilledEmail = params.get('email') ?? ''
  const inviteToken = params.get('invite') ?? ''
  const roleParam = params.get('role')
  const role: Role | null = roleParam === 'user' || roleParam === 'nutricionista' ? roleParam : null

  // Invited users (vindo de /aceitar-convite) são sempre pacientes — pula a tela de role.
  useEffect(() => {
    if (!role && (prefilledEmail || inviteToken)) {
      const qs = new URLSearchParams()
      qs.set('role', 'user')
      if (prefilledEmail) qs.set('email', prefilledEmail)
      if (inviteToken) qs.set('invite', inviteToken)
      router.replace(`/auth/signup?${qs.toString()}`)
    }
  }, [role, prefilledEmail, inviteToken, router])

  const [name, setName] = useState("")
  const [email, setEmail] = useState(prefilledEmail)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [acceptedAge, setAcceptedAge] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // ─── Tela 1: seleção de papel ─────────────────────────────────────────────
  if (!role) {
    return <RolePicker />
  }

  // Nutri pula onboarding intermediário e vai direto pro painel. Paciente
  // continua passando pelo quiz inicial de /onboarding.
  const onboardingPath = role === 'nutricionista' ? '/nutri' : '/onboarding'

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptedAge) {
      toast.error(t('ageRequired'))
      return
    }
    if (password.length < 8) {
      toast.error(t('passwordMin'))
      return
    }
    if (!isSupabaseConfigured()) {
      toast.error(tErrors('notConfigured'))
      return
    }
    setLoading(true)
    track("signup_started", { method: "password", role })
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // role no user_metadata é lido pelo callback para preencher profiles.role
          data: { name, role },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboardingPath)}`,
        },
      })
      if (error) throw error
      if (data.session && data.user) {
        identify(data.user.id, { email: data.user.email, role })
        track("signup_completed", { method: "password", needs_verification: false, role })
        // Nutri: marca role + onboarding_completed imediatamente, então o
        // middleware nunca redireciona para /onboarding-nutri (que foi
        // removido do fluxo). /auth/callback faz o mesmo, mas não roda
        // quando o signup já devolve sessão (sem confirmação de e-mail).
        if (role === "nutricionista") {
          await supabase
            .from("profiles")
            .update({
              role: "nutricionista",
              onboarding_completed: true,
              onboarding_completed_at: new Date().toISOString(),
            })
            .eq("id", data.user.id)
        }
        router.push(onboardingPath)
        router.refresh()
      } else {
        track("signup_completed", { method: "password", needs_verification: true, role })
        setDone(true)
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : t('errorGeneric')
      console.error("signUp error:", err)
      let friendly = raw
      if (raw === "User already registered") {
        friendly = t('errorAlreadyRegistered')
      } else if (/email rate limit|over_email_send_rate_limit/i.test(raw)) {
        friendly = t('errorRateLimit')
      } else if (/error sending|smtp|email confirmation|email_provider_disabled/i.test(raw)) {
        friendly = t('errorSmtp')
      } else if (/email signups are disabled/i.test(raw)) {
        friendly = t('errorSignupsDisabled')
      }
      toast.error(friendly, { duration: 10000 })
    } finally {
      setLoading(false)
    }
  }

  const oauthSignIn = async (provider: 'google' | 'apple', setBusy: (b: boolean) => void) => {
    if (!acceptedAge) {
      toast.error(t('ageRequired'))
      return
    }
    if (!isSupabaseConfigured()) {
      toast.error(tErrors('notConfigured'))
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboardingPath)}&role=${role}`,
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tOauth(provider === 'google' ? 'googleError' : 'appleError')
      toast.error(message)
      setBusy(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboardingPath)}` },
      })
      if (error) {
        toast.error(error.message || t('resendError'))
        return
      }
      toast.success(t('resendSuccess'))
      setResendCooldown(60)
      const interval = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) { clearInterval(interval); return 0 }
          return c - 1
        })
      }, 1000)
    } catch {
      toast.error(tErrors('networkError'))
    } finally {
      setResending(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#4a7c4a]/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-[#4a7c4a]" />
          </div>
          <div>
            <h2 className="font-serif text-3xl italic text-[#1a3a2a]">{t('verifyTitle')}</h2>
            <p className="mt-3 text-[#1a3a2a]/60 leading-relaxed">
              {t.rich('verifyBody', {
                email: () => <strong className="text-[#1a3a2a]">{email}</strong>,
              })}
            </p>
            <p className="mt-2 text-xs text-[#1a3a2a]/50 leading-relaxed">
              {t('verifyHint')}
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="rounded-full bg-[#1a3a2a] text-white hover:bg-[#1a3a2a]/90 px-8"
            >
              {resending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : resendCooldown > 0
                  ? t('resendCooldown', { seconds: resendCooldown })
                  : t('resend')}
            </Button>
            <Button variant="ghost" onClick={() => router.push("/auth/login")}
              className="text-[#1a3a2a]/60 hover:text-[#1a3a2a]">
              {t('backToLogin')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Tela 2: formulário ──────────────────────────────────────────────────
  return (
    <div className="page-enter min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#1a3a2a] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2 2 4.5c.5 2.5 0 4.5-1 6" />
                <path d="M15.8 17a7 7 0 0 1-12.6-3" />
              </svg>
            </div>
            <span className="font-serif text-2xl italic text-[#1a3a2a]">Salus</span>
          </Link>
          <div className="text-center">
            <h1 className="font-serif text-3xl italic text-[#1a3a2a]">{t('heading')}</h1>
            <p className="mt-2 text-sm text-[#1a3a2a]/50">
              {role === 'nutricionista'
                ? 'Conta de nutricionista — acesso imediato ao painel'
                : t('tagline')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/auth/signup')}
          className="text-xs text-[#1a3a2a]/60 hover:text-[#1a3a2a] inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3 h-3" />
          Trocar tipo de conta
        </button>

        {role === 'nutricionista' && (
          <div className="rounded-3xl bg-gradient-to-br from-[#1a3a2a] to-[#0f2519] p-6 ring-1 ring-white/5 text-white">
            <span className="inline-block rounded-full bg-[#c8a538]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#c8a538] mb-3">
              {tNutri('kicker')}
            </span>
            <h3 className="font-serif text-xl sm:text-2xl italic leading-tight">
              {tNutri('headline')}
            </h3>
            <p className="text-xs text-white/70 mt-2">{tNutri('tagline')}</p>
            <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-white/70">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#c8a538] shrink-0" />
                <span>{tNutri('bullet1')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#c8a538] shrink-0" />
                <span>{tNutri('bullet2')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#c8a538] shrink-0" />
                <span>{tNutri('bullet3')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#c8a538] shrink-0" />
                <span>{tNutri('bullet4')}</span>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-white/10">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-[#c8a538] mb-3">
                {tNutri('ladderTitle')}
              </p>
              <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 divide-y divide-white/5">
                {[
                  { p: '1', r: '5%' },
                  { p: '2', r: '6%' },
                  { p: '3', r: '7%' },
                  { p: '4', r: '8%' },
                  { p: '5', r: '9%' },
                  { p: '6–10', r: '10%' },
                  { p: '11+', r: '12%' },
                ].map(({ p, r }) => (
                  <div key={p} className="flex items-center justify-between px-4 py-2 text-xs">
                    <span className="text-white/60">{tNutri('ladderPatients', { count: p })}</span>
                    <span className="font-bold text-white">{r}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-white/40 leading-relaxed">{tNutri('ladderNote')}</p>
            </div>
          </div>
        )}

        <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-8 space-y-5">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-[#1a3a2a]">{t('nameLabel')}</Label>
              <Input id="name" type="text" placeholder={t('name')}
                value={name} onChange={(e) => setName(e.target.value)}
                required className="h-12 rounded-xl border-[#e4ddd4] bg-[#faf8f4] focus:border-[#1a3a2a] focus:ring-[#1a3a2a]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-[#1a3a2a]">{t('email')}</Label>
              <Input id="email" type="email" placeholder={t('emailPlaceholder')}
                value={email} onChange={(e) => setEmail(e.target.value)}
                required className="h-12 rounded-xl border-[#e4ddd4] bg-[#faf8f4] focus:border-[#1a3a2a] focus:ring-[#1a3a2a]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-[#1a3a2a]">{t('password')}</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder={t('passwordHint')}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={8} className="h-12 pr-11 rounded-xl border-[#e4ddd4] bg-[#faf8f4] focus:border-[#1a3a2a] focus:ring-[#1a3a2a]" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a3a2a]/50 hover:text-[#1a3a2a] transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <label className="flex items-start gap-2.5 text-xs text-[#1a3a2a]/70 leading-relaxed cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptedAge}
                onChange={(e) => setAcceptedAge(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#e4ddd4] text-[#1a3a2a] focus:ring-[#1a3a2a]"
              />
              <span>
                {t('ageGateBefore')}
                <Link href="/termos" className="text-[#1a3a2a] underline hover:no-underline">{t('terms')}</Link>
                {t('ageGateAnd')}
                <Link href="/privacidade" className="text-[#1a3a2a] underline hover:no-underline">{t('privacy')}</Link>
                {t('ageGateAfter')}
              </span>
            </label>
            <Button type="submit" disabled={loading || !acceptedAge}
              className="w-full h-12 rounded-full bg-[#1a3a2a] font-semibold text-white shadow-md hover:bg-[#1a3a2a]/90 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('submit')}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-[#1a3a2a]/50 text-[10px] font-semibold tracking-widest">{tCommon('orSeparator')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <Button type="button" variant="outline" onClick={() => oauthSignIn('apple', setAppleLoading)} disabled={appleLoading}
              className="w-full h-12 rounded-full bg-black border-black text-white font-medium hover:bg-black/90">
              {appleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              )}
              {tOauth('appleCta')}
            </Button>
            <Button type="button" variant="outline" onClick={() => oauthSignIn('google', setGoogleLoading)} disabled={googleLoading}
              className="w-full h-12 rounded-full border-[#e4ddd4] text-[#1a3a2a] font-medium hover:bg-[#1a3a2a]/5">
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              {tOauth('googleCta')}
            </Button>
          </div>

          <p className="text-center text-sm text-[#1a3a2a]/50 pt-1">
            {t('haveAccount')}{" "}
            <Link href="/auth/login" className="font-semibold text-[#1a3a2a] hover:underline">
              {t('loginCta')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function RolePicker() {
  return (
    <div className="page-enter min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-lg space-y-8">
        <div className="flex flex-col items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#1a3a2a] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2 2 4.5c.5 2.5 0 4.5-1 6" />
                <path d="M15.8 17a7 7 0 0 1-12.6-3" />
              </svg>
            </div>
            <span className="font-serif text-2xl italic text-[#1a3a2a]">Salus</span>
          </Link>
          <div className="text-center">
            <h1 className="font-serif text-3xl italic text-[#1a3a2a]">Como você vai usar o Salus?</h1>
            <p className="mt-2 text-sm text-[#1a3a2a]/60 max-w-sm mx-auto">
              Escolha o tipo de conta. Você poderá mudar depois entrando em contato com o suporte.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <Link href="/auth/signup?role=user" className="group">
            <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-7 transition-all hover:ring-[#1a3a2a]/30 hover:shadow-md flex items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-[#1a3a2a]/8 flex items-center justify-center flex-shrink-0 group-hover:bg-[#1a3a2a]/12 transition-colors">
                <User className="w-6 h-6 text-[#1a3a2a]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif italic text-2xl text-[#1a3a2a]">Sou paciente</p>
                <p className="text-sm text-[#1a3a2a]/60 mt-1.5 leading-relaxed">
                  Quero registrar refeições, acompanhar metas baseadas em ciência e me conectar
                  com meu nutricionista.
                </p>
              </div>
            </div>
          </Link>

          <Link href="/auth/signup?role=nutricionista" className="group">
            <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-7 transition-all hover:ring-[#c4614a]/30 hover:shadow-md flex items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-[#c4614a]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#c4614a]/15 transition-colors">
                <Stethoscope className="w-6 h-6 text-[#c4614a]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif italic text-2xl text-[#1a3a2a]">Sou nutricionista</p>
                <p className="text-sm text-[#1a3a2a]/60 mt-1.5 leading-relaxed">
                  Acompanhe seus pacientes, defina seu protocolo e use a IA para reforçar suas
                  recomendações. Acesso imediato ao painel.
                </p>
              </div>
            </div>
          </Link>
        </div>

        <p className="text-center text-sm text-[#1a3a2a]/50">
          Já tem conta?{" "}
          <Link href="/auth/login" className="font-semibold text-[#1a3a2a] hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1a3a2a]" />
      </div>
    }>
      <SignUpInner />
    </Suspense>
  )
}
