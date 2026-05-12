"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ArrowRight } from "lucide-react"

const ALLOWED = /[A-Z2-9]/

export function CodeEntryForm({
  token,
  invitedEmail,
  isLoggedIn,
}: {
  token: string
  invitedEmail: string
  isLoggedIn: boolean
}) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onChange = (raw: string) => {
    const cleaned = raw
      .toUpperCase()
      .split("")
      .filter((c) => ALLOWED.test(c))
      .slice(0, 6)
      .join("")
    const formatted = cleaned.length > 3 ? `${cleaned.slice(0, 3)}-${cleaned.slice(3)}` : cleaned
    setCode(formatted)
    if (error) setError(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const cleaned = code.replace(/-/g, "")
    if (cleaned.length !== 6) {
      setError("O código tem 6 caracteres.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/nutri/invite/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code: cleaned }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(body.error || "Código incorreto.")
        return
      }
      // Cookie is set by the server. Now route to the next step.
      const next = isLoggedIn
        ? "/aceitar-convite/confirmar"
        : `/auth/signup?email=${encodeURIComponent(invitedEmail)}`
      router.push(next)
    } catch {
      setError("Erro de rede. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <div>
        <Input
          inputMode="text"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="ABC-DEF"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          className="h-14 text-center text-xl tracking-[0.3em] font-mono uppercase"
          aria-label="Código de acesso"
          aria-invalid={!!error}
        />
        {error && <p className="text-xs text-[#c4614a] mt-2">{error}</p>}
      </div>
      <Button
        type="submit"
        disabled={submitting || code.replace(/-/g, "").length !== 6}
        className="w-full h-12 rounded-full bg-[#1a3a2a] text-white hover:bg-[#1a3a2a]/90"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Continuar
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
      <p className="text-[11px] text-[#1a3a2a]/50 text-center">
        Convite para <span className="font-medium text-[#1a3a2a]">{invitedEmail}</span>
      </p>
    </form>
  )
}
