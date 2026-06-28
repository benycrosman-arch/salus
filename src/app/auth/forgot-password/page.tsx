"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { Loader2, CheckCircle, ArrowLeft, Eye, EyeOff } from "@/components/icons"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { LanguageSwitcher } from "@/components/language-switcher"
import { SalusMark } from "@/components/brand/logo"

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <Link href="/" className="flex items-center gap-2.5 group">
        <SalusMark size={34} />
        <span className="font-serif text-2xl italic text-[#1a3a2a]">Salus</span>
      </Link>
      <div className="text-center">
        <h1 className="font-serif text-3xl italic text-[#1a3a2a]">{title}</h1>
        <p className="mt-2 text-sm text-[#1a3a2a]/50">{subtitle}</p>
      </div>
    </div>
  )
}

function RequestResetForm() {
  const supabase = createClient()
  const t = useTranslations("auth.forgot")
  const tErrors = useTranslations("auth.errors")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!isSupabaseConfigured()) {
      toast.error(tErrors("notConfiguredShort"))
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?recovery=1`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("errorGeneric")
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#4a7c4a]/10 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-[#4a7c4a]" />
        </div>
        <div>
          <h2 className="font-serif text-3xl italic text-[#1a3a2a]">{t("verifyTitle")}</h2>
          <p className="mt-3 text-[#1a3a2a]/50 leading-relaxed">
            {t.rich("verifyBody", {
              email: () => <strong className="text-[#1a3a2a]">{email}</strong>,
            })}
          </p>
        </div>
        <Button variant="outline" asChild className="rounded-full border-[#e4ddd4] text-[#1a3a2a] hover:bg-[#1a3a2a]/5 px-8">
          <Link href="/auth/login">{t("backToLogin")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <PageHeader title={t("title")} subtitle={t("tagline")} />
      <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-8 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-[#1a3a2a]">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl border-[#e4ddd4] bg-[#faf8f4] focus:border-[#1a3a2a] focus:ring-[#1a3a2a]"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-[#1a3a2a] font-semibold text-white shadow-md hover:bg-[#1a3a2a]/90 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("submitFull")}
          </Button>
        </form>
        <p className="text-center text-sm text-[#1a3a2a]/50 pt-1 flex items-center justify-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          <Link href="/auth/login" className="font-semibold text-[#1a3a2a] hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  )
}

function ResetPasswordForm() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (password.length < 8) {
      toast.error("A senha precisa ter pelo menos 8 caracteres.")
      return
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.")
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success("Senha atualizada. Você já está conectado.")
      router.push("/dashboard")
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Não foi possível atualizar a senha. Tente o link de recuperação de novo."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <PageHeader
        title="Defina sua nova senha"
        subtitle="Escolha uma senha forte com pelo menos 8 caracteres."
      />
      <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-8 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-[#1a3a2a]">Nova senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={show ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="h-12 pr-11 rounded-xl border-[#e4ddd4] bg-[#faf8f4] focus:border-[#1a3a2a] focus:ring-[#1a3a2a]"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={show}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a3a2a]/50 hover:text-[#1a3a2a] transition-colors"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-sm font-medium text-[#1a3a2a]">Confirme a nova senha</Label>
            <Input
              id="confirm"
              type={show ? "text" : "password"}
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="h-12 rounded-xl border-[#e4ddd4] bg-[#faf8f4] focus:border-[#1a3a2a] focus:ring-[#1a3a2a]"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-[#1a3a2a] font-semibold text-white shadow-md hover:bg-[#1a3a2a]/90 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Atualizar senha"}
          </Button>
        </form>
      </div>
    </div>
  )
}

function ForgotPasswordRouter() {
  const params = useSearchParams()
  const step = params.get("step")
  return step === "reset" ? <ResetPasswordForm /> : <RequestResetForm />
}

export default function ForgotPasswordPage() {
  return (
    <div className="page-enter min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Suspense fallback={
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#1a3a2a]" />
        </div>
      }>
        <ForgotPasswordRouter />
      </Suspense>
    </div>
  )
}
