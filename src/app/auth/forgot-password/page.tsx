"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { Loader2, CheckCircle, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const t = useTranslations('auth.forgot')
  const tErrors = useTranslations('auth.errors')
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured()) {
      toast.error(tErrors('notConfiguredShort'))
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('errorGeneric')
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
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
            <p className="mt-3 text-[#1a3a2a]/50 leading-relaxed">
              {t.rich('verifyBody', {
                email: () => <strong className="text-[#1a3a2a]">{email}</strong>,
              })}
            </p>
          </div>
          <Button variant="outline" asChild className="rounded-full border-[#e4ddd4] text-[#1a3a2a] hover:bg-[#1a3a2a]/5 px-8">
            <Link href="/auth/login">{t('backToLogin')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md space-y-8">
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
            <p className="mt-2 text-sm text-[#1a3a2a]/50">
              {t('tagline')}
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-[#1a3a2a]">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl border-[#e4ddd4] bg-[#faf8f4] focus:border-[#1a3a2a] focus:ring-[#1a3a2a]"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-[#1a3a2a] font-semibold text-white shadow-md hover:bg-[#1a3a2a]/90 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('submitFull')}
            </Button>
          </form>

          <p className="text-center text-sm text-[#1a3a2a]/50 pt-1 flex items-center justify-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <Link href="/auth/login" className="font-semibold text-[#1a3a2a] hover:underline">
              {t('backToLogin')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
