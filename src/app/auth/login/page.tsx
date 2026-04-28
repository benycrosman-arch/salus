"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { identify, track } from "@/lib/posthog"
import { useTranslations } from "next-intl"
import { LanguageSwitcher } from "@/components/language-switcher"

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed: "Não conseguimos validar o link. Tente o login direto.",
  code_exchange_failed: "Link expirado ou aberto em outro navegador. Faça login pelo formulário ou peça novo link.",
  otp_expired: "O link expirou. Reenvie o e-mail de verificação.",
  otp_invalid: "Token inválido. O link pode ter sido usado ou está corrompido.",
  invalid_otp_type: "Link inválido.",
  no_auth_params: "Link incompleto. Verifique o e-mail e tente abrir o link de novo.",
  access_denied: "Acesso negado pela autenticação.",
}

function useAuthErrorToast() {
  const searchParams = useSearchParams()
  useEffect(() => {
    const err = searchParams.get("error")
    const msg = searchParams.get("msg")
    if (!err) return
    const friendly = ERROR_MESSAGES[err] || ERROR_MESSAGES[err.toLowerCase()] || "Erro na autenticação."
    toast.error(msg ? `${friendly} (${msg})` : friendly, { duration: 8000 })
    // Clean the URL so refresh doesn't re-toast
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.delete("error")
      url.searchParams.delete("msg")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams])
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || "/dashboard"
  const supabase = createClient()
  const t = useTranslations('auth.login')
  const tCommon = useTranslations('common')
  useAuthErrorToast()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [acceptedPolicies, setAcceptedPolicies] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptedPolicies) {
      toast.error("Você precisa concordar com a Política de Privacidade e os Termos para entrar.")
      return
    }
    if (!isSupabaseConfigured()) {
      toast.error("Autenticação ainda não configurada. Configure as variáveis de ambiente do Supabase.")
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // Ensure profile row exists (safety net)
      await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          name: data.user.user_metadata?.name ?? data.user.email?.split('@')[0] ?? '',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, role')
        .eq('id', data.user.id)
        .single()
      identify(data.user.id, { email: data.user.email, role: profile?.role ?? 'user' })
      track('login', { method: 'password', role: profile?.role ?? 'user' })
      if (!profile?.onboarding_completed) {
        router.push('/onboarding')
      } else if (profile.role === 'nutricionista') {
        router.push('/nutri')
      } else {
        router.push(redirectTo)
      }
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('invalid')
      toast.error(message === "Invalid login credentials" ? t('invalid') : message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!acceptedPolicies) {
      toast.error("Você precisa concordar com a Política de Privacidade e os Termos para entrar.")
      return
    }
    if (!isSupabaseConfigured()) {
      toast.error("Autenticação ainda não configurada. Configure as variáveis de ambiente do Supabase.")
      return
    }
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}` },
      })
      if (error) throw error
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao entrar com Google"
      toast.error(message)
      setGoogleLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    if (!acceptedPolicies) {
      toast.error("Você precisa concordar com a Política de Privacidade e os Termos para entrar.")
      return
    }
    if (!isSupabaseConfigured()) {
      toast.error("Autenticação ainda não configurada. Configure as variáveis de ambiente do Supabase.")
      return
    }
    setAppleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}` },
      })
      if (error) throw error
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao entrar com Apple"
      toast.error(message)
      setAppleLoading(false)
    }
  }

  return (
    <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-8 space-y-5">
      <form onSubmit={handleSignIn} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-[#1a3a2a]">{t('email')}</Label>
          <Input id="email" type="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            required className="h-12 rounded-xl border-[#e4ddd4] bg-[#faf8f4] focus:border-[#1a3a2a] focus:ring-[#1a3a2a]" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-[#1a3a2a]">{t('password')}</Label>
            <Link href="/auth/forgot-password" className="text-xs text-[#c4614a] hover:underline">
              {t('forgot')}
            </Link>
          </div>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required className="h-12 pr-11 rounded-xl border-[#e4ddd4] bg-[#faf8f4] focus:border-[#1a3a2a] focus:ring-[#1a3a2a]" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a3a2a]/50 hover:text-[#1a3a2a] transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <label className="flex items-start gap-2.5 text-xs text-[#1a3a2a]/70 leading-relaxed cursor-pointer select-none">
          <input
            type="checkbox"
            checked={acceptedPolicies}
            onChange={(e) => setAcceptedPolicies(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#e4ddd4] text-[#1a3a2a] focus:ring-[#1a3a2a]"
          />
          <span>
            Concordo com a{" "}
            <Link href="/privacidade" className="text-[#1a3a2a] underline hover:no-underline">Política de Privacidade</Link>
            {" "}e os{" "}
            <Link href="/termos" className="text-[#1a3a2a] underline hover:no-underline">Termos de Uso</Link>.
          </span>
        </label>
        <Button type="submit" disabled={loading || !acceptedPolicies}
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
        <Button type="button" variant="outline" onClick={handleAppleSignIn} disabled={appleLoading || !acceptedPolicies}
          className="w-full h-12 rounded-full bg-black border-black text-white font-medium hover:bg-black/90 disabled:opacity-50">
          {appleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
          )}
          Continuar com Apple
        </Button>
        <Button type="button" variant="outline" onClick={handleGoogleSignIn} disabled={googleLoading || !acceptedPolicies}
          className="w-full h-12 rounded-full border-[#e4ddd4] text-[#1a3a2a] font-medium hover:bg-[#1a3a2a]/5 disabled:opacity-50">
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
          Continuar com Google
        </Button>
      </div>

      <p className="text-center text-sm text-[#1a3a2a]/50 pt-1">
        {t('noAccount')}{" "}
        <Link href="/auth/signup" className="font-semibold text-[#1a3a2a] hover:underline">
          {t('signupCta')}
        </Link>
      </p>
    </div>
  )
}

function LoginPageHeader() {
  const t = useTranslations('auth.login')
  return (
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
        <h1 className="font-serif text-3xl italic text-[#1a3a2a]">{t('title')}</h1>
        <p className="mt-2 text-sm text-[#1a3a2a]/50">{t('subtitle')}</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="page-enter min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md space-y-8">
        <LoginPageHeader />
        <Suspense fallback={
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#1a3a2a]" />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
