"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export default function SignUpPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres")
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) throw error
      setDone(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar conta"
      toast.error(message === "User already registered" ? "Este e-mail já está cadastrado" : message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      })
      if (error) throw error
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao entrar com Google"
      toast.error(message)
      setGoogleLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#4a7c4a]/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-[#4a7c4a]" />
          </div>
          <div>
            <h2 className="font-serif text-3xl italic text-[#1a3a2a]">Verifique seu e-mail</h2>
            <p className="mt-3 text-[#1a3a2a]/50 leading-relaxed">
              Enviamos um link de confirmação para <strong className="text-[#1a3a2a]">{email}</strong>.
              Clique nele para ativar sua conta e começar.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/auth/login")}
            className="rounded-full border-[#e4ddd4] text-[#1a3a2a] hover:bg-[#1a3a2a]/5 px-8">
            Voltar ao login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
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
            <h1 className="font-serif text-3xl italic text-[#1a3a2a]">Comece sua jornada</h1>
            <p className="mt-2 text-sm text-[#1a3a2a]/50">
              Crie sua conta e descubra o que seus alimentos fazem pelo seu corpo
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-8 space-y-5">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-[#1a3a2a]">Nome completo</Label>
              <Input id="name" type="text" placeholder="Seu nome"
                value={name} onChange={(e) => setName(e.target.value)}
                required className="h-12 rounded-xl border-[#e4ddd4] bg-[#faf8f4] focus:border-[#1a3a2a] focus:ring-[#1a3a2a]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-[#1a3a2a]">E-mail</Label>
              <Input id="email" type="email" placeholder="voce@exemplo.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required className="h-12 rounded-xl border-[#e4ddd4] bg-[#faf8f4] focus:border-[#1a3a2a] focus:ring-[#1a3a2a]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-[#1a3a2a]">Senha</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Mínimo 8 caracteres"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={8} className="h-12 pr-11 rounded-xl border-[#e4ddd4] bg-[#faf8f4] focus:border-[#1a3a2a] focus:ring-[#1a3a2a]" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a3a2a]/30 hover:text-[#1a3a2a] transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading}
              className="w-full h-12 rounded-full bg-[#1a3a2a] font-semibold text-white shadow-md hover:bg-[#1a3a2a]/90 transition-all">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar conta"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-[#1a3a2a]/30 text-[10px] font-semibold tracking-widest">ou</span>
            </div>
          </div>

          <Button type="button" variant="outline" onClick={handleGoogleSignUp} disabled={googleLoading}
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
            Continuar com Google
          </Button>

          <p className="text-xs text-center text-[#1a3a2a]/40 leading-relaxed">
            Ao criar uma conta, você concorda com nossos{" "}
            <Link href="/termos" className="text-[#1a3a2a] hover:underline">Termos</Link>
            {" "}e{" "}
            <Link href="/privacidade" className="text-[#1a3a2a] hover:underline">Privacidade</Link>
          </p>

          <p className="text-center text-sm text-[#1a3a2a]/50 pt-1">
            Já tem uma conta?{" "}
            <Link href="/auth/login" className="font-semibold text-[#1a3a2a] hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
