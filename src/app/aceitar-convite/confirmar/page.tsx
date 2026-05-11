"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Stethoscope, AlertCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

/**
 * Authenticated landing for `/aceitar-convite/confirmar`.
 *
 * Reached when a logged-in user lands on /aceitar-convite (we redirect here),
 * or when /auth/callback fails to auto-link and bounces here. The token lives
 * in the httpOnly `salus_invite` cookie set by /aceitar-convite — we never
 * need it in the URL or in JS.
 *
 * On submit we POST /api/nutri/invite/accept with no body; the endpoint reads
 * the cookie itself and links the patient to the nutri. The most common
 * non-2xx is 403 with code='email_mismatch' (signed in with the wrong email);
 * surface that with a "trocar de conta" path instead of a generic error.
 */
export default function ConfirmInvitePage() {
  const router = useRouter()
  const [state, setState] = useState<"idle" | "submitting" | "ok" | "error">("idle")
  const [error, setError] = useState<{
    message: string
    code?: string
    invitedEmail?: string
  } | null>(null)

  const accept = async () => {
    setState("submitting")
    setError(null)
    try {
      const res = await fetch("/api/nutri/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // No body — accept route reads the token from the salus_invite cookie.
        body: JSON.stringify({}),
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        code?: string
        invited_email?: string
      }
      if (!res.ok) {
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
    // After logout the user can sign in with the correct address;
    // the salus_invite cookie persists so the link can still be consumed.
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
          onClick={accept}
          disabled={state === "submitting"}
          className="rounded-full bg-[#1a3a2a] text-white hover:bg-[#1a3a2a]/90 px-8"
        >
          {state === "submitting" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar vínculo"}
        </Button>
      </div>
    </div>
  )
}
