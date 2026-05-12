"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Stethoscope, AlertCircle, Mail, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

const ALLOWED = /[A-Z2-9]/

/**
 * Authenticated landing for `/aceitar-convite/confirmar`.
 *
 * Reached when a logged-in user lands on /aceitar-convite (we redirect here
 * after they verify the code), or when /auth/callback fails to auto-link
 * and bounces here. The token + code live in the httpOnly `salus_invite`
 * cookie set by /api/nutri/invite/verify-code.
 *
 * If the cookie's missing the code (e.g. legacy invite or stale state) the
 * accept call returns 400 code_required and we show an input here.
 */
export default function ConfirmInvitePage() {
  const router = useRouter()
  const [state, setState] = useState<"idle" | "submitting" | "ok" | "error" | "code_required">("idle")
  const [code, setCode] = useState("")
  const [error, setError] = useState<{
    message: string
    code?: string
    invitedEmail?: string
  } | null>(null)

  const onCodeChange = (raw: string) => {
    const cleaned = raw
      .toUpperCase()
      .split("")
      .filter((c) => ALLOWED.test(c))
      .slice(0, 6)
      .join("")
    const formatted = cleaned.length > 3 ? `${cleaned.slice(0, 3)}-${cleaned.slice(3)}` : cleaned
    setCode(formatted)
  }

  const accept = async (overrideCode?: string) => {
    setState("submitting")
    setError(null)
    try {
      const payload: { code?: string } = {}
      if (overrideCode) payload.code = overrideCode.replace(/-/g, "")
      const res = await fetch("/api/nutri/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        code?: string
        invited_email?: string
      }
      if (!res.ok) {
        if (body.code === "code_required" || body.code === "code_invalid") {
          setState("code_required")
          setError({ message: body.error || "Código obrigatório.", code: body.code })
          return
        }
        setError({
          message: body.error || "Não foi possível aceitar o convite.",
          code: body.code,
          invitedEmail: body.invited_email,
        })
        setState("error")
        return
      }
      setState("ok")
      toast.success("Vinculado ao seu nutricionista.")
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError({ message: "Erro de rede. Tente novamente." })
      setState("error")
    }
  }

  const switchAccount = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  if (error && state === "error") {
    const isMismatch = error.code === "email_mismatch"
    return (
      <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-[#c4614a]/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-[#c4614a]" />
          </div>
          <h1 className="font-serif text-2xl italic text-[#1a3a2a]">
            {isMismatch ? "Conta diferente do convite" : "Não foi possível aceitar"}
          </h1>
          <p className="text-sm text-[#1a3a2a]/60 font-body">{error.message}</p>
          {isMismatch && error.invitedEmail && (
            <div className="rounded-2xl bg-white ring-1 ring-black/[0.04] px-4 py-3 flex items-center gap-3 justify-center">
              <Mail className="w-4 h-4 text-[#1a3a2a]/50" />
              <span className="text-xs text-[#1a3a2a]/70 font-body">
                Convite para{" "}
                <span className="font-semibold text-[#1a3a2a]">{error.invitedEmail}</span>
              </span>
            </div>
          )}
          <div className="flex flex-col gap-2 items-center">
            {isMismatch && (
              <Button
                className="rounded-full bg-[#1a3a2a] text-white hover:bg-[#1a3a2a]/90 px-8"
                onClick={switchAccount}
              >
                Trocar de conta
              </Button>
            )}
            <Button
              variant="outline"
              className="rounded-full border-[#e4ddd4]"
              onClick={() => router.push("/dashboard")}
            >
              Ir para o painel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (state === "code_required") {
    return (
      <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-8">
            <div className="w-12 h-12 rounded-2xl bg-[#1a3a2a]/10 flex items-center justify-center mb-5">
              <KeyRound className="w-5 h-5 text-[#1a3a2a]" />
            </div>
            <h1 className="font-serif text-2xl italic text-[#1a3a2a] leading-tight">
              Digite o código do convite
            </h1>
            <p className="text-sm text-[#1a3a2a]/60 mt-2 leading-relaxed">
              Seu nutricionista te enviou um código de 6 caracteres separadamente. Ele é
              necessário para concluir a vinculação.
            </p>
            {error?.message && (
              <p className="text-xs text-[#c4614a] mt-3">{error.message}</p>
            )}
            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (code.replace(/-/g, "").length !== 6) {
                  setError({ message: "O código tem 6 caracteres." })
                  return
                }
                accept(code)
              }}
            >
              <Input
                inputMode="text"
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="ABC-DEF"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                className="h-14 text-center text-xl tracking-[0.3em] font-mono uppercase"
                aria-label="Código de acesso"
              />
              <Button
                type="submit"
                className="w-full h-12 rounded-full bg-[#1a3a2a] text-white hover:bg-[#1a3a2a]/90"
                disabled={code.replace(/-/g, "").length !== 6}
              >
                Confirmar vínculo
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-[#1a3a2a]/10 flex items-center justify-center mx-auto">
          <Stethoscope className="w-6 h-6 text-[#1a3a2a]" />
        </div>
        <h1 className="font-serif text-2xl italic text-[#1a3a2a]">Aceitar vínculo com nutricionista</h1>
        <p className="text-sm text-[#1a3a2a]/60 font-body">
          Ao confirmar, seu nutricionista poderá acompanhar suas refeições, exames e progresso na
          Salus. Você pode encerrar o vínculo a qualquer momento em Configurações.
        </p>
        <Button
          onClick={() => accept()}
          disabled={state === "submitting"}
          className="rounded-full bg-[#1a3a2a] text-white hover:bg-[#1a3a2a]/90 px-8"
        >
          {state === "submitting" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar vínculo"}
        </Button>
      </div>
    </div>
  )
}
