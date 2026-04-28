"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Stethoscope, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

/**
 * Authenticated landing for `/aceitar-convite/confirmar?token=...`.
 *
 * Reached when a logged-in user clicks an invite email — they confirm linking
 * to that nutricionista, we POST /api/nutri/invite/accept, then send them to
 * the dashboard. Done as a client component so we can show progress + handle
 * the "already-a-nutri" 409 cleanly.
 */
export default function ConfirmInvitePage() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") || ""
  const [state, setState] = useState<"idle" | "submitting" | "ok" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) setError("Token ausente.")
  }, [token])

  const accept = async () => {
    setState("submitting")
    setError(null)
    try {
      const res = await fetch("/api/nutri/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || "Não foi possível aceitar o convite.")
        setState("error")
        return
      }
      setState("ok")
      toast.success("Vinculado ao seu nutricionista.")
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Erro de rede. Tente novamente.")
      setState("error")
    }
  }

  if (error && state !== "ok") {
    return (
      <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-[#c4614a]/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-[#c4614a]" />
          </div>
          <h1 className="font-serif text-2xl italic text-[#1a3a2a]">Não foi possível aceitar</h1>
          <p className="text-sm text-[#1a3a2a]/60 font-body">{error}</p>
          <Button variant="outline" className="rounded-full" onClick={() => router.push("/dashboard")}>
            Ir para o painel
          </Button>
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
          disabled={state === "submitting" || !token}
          className="rounded-full bg-[#1a3a2a] text-white hover:bg-[#1a3a2a]/90 px-8"
        >
          {state === "submitting" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar vínculo"}
        </Button>
      </div>
    </div>
  )
}
