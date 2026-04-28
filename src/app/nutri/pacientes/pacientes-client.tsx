"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, Copy, Check, Users } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { track } from "@/lib/posthog"

type Patient = { id: string; name: string | null; email: string | null }
type Invite = {
  id: string
  patient_email: string
  status: string
  created_at: string
  expires_at: string
  token: string
}

export function PacientesClient({
  patients,
  invites,
}: {
  patients: Patient[]
  invites: Invite[]
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const sendInvite = async () => {
    if (!email.trim()) return
    setSending(true)
    try {
      const res = await fetch("/api/nutri/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error || "Falha ao convidar")
        return
      }
      track("nutri_invite_sent", { method: "email", delivered: !!body.emailSent })
      if (body.emailSent) {
        toast.success(`Convite enviado para ${email}`)
      } else {
        toast.success(
          `Convite criado para ${email}. Copie o link e envie por WhatsApp ou e-mail.`,
        )
      }
      setEmail("")
      router.refresh()
    } catch {
      toast.error("Erro de rede")
    } finally {
      setSending(false)
    }
  }

  const copyLink = (token: string, id: string) => {
    const baseUrl = window.location.origin
    const link = `${baseUrl}/aceitar-convite?token=${token}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id)
      toast.success("Link copiado")
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <Card className="border-0 shadow-md p-5">
        <h2 className="text-sm font-semibold text-[#1a3a2a] mb-3 flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Convidar paciente
        </h2>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="invite-email" className="sr-only">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="paciente@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button onClick={sendInvite} disabled={sending || !email.trim()}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar convite"}
          </Button>
        </div>
        <p className="text-xs text-[#1a3a2a]/50 mt-2 font-body">
          Vamos gerar um link único. Você pode copiar e enviar por WhatsApp ou e-mail.
        </p>
      </Card>

      {/* Active patients */}
      <Card className="border-0 shadow-md p-5">
        <h2 className="text-sm font-semibold text-[#1a3a2a] mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Pacientes ativos ({patients.length})
        </h2>
        {patients.length === 0 ? (
          <p className="text-sm text-[#1a3a2a]/60 py-6 text-center">
            Nenhum paciente vinculado ainda.
          </p>
        ) : (
          <ul className="divide-y divide-[#e4ddd4]">
            {patients.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#1a3a2a]">{p.name || "Sem nome"}</p>
                  <p className="text-xs text-[#1a3a2a]/50 font-body">{p.email}</p>
                </div>
                <Link
                  href={`/nutri/pacientes/${p.id}`}
                  className="text-xs text-[#c4614a] hover:underline"
                >
                  Ver perfil →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Invites */}
      <Card className="border-0 shadow-md p-5">
        <h2 className="text-sm font-semibold text-[#1a3a2a] mb-3">
          Convites enviados ({invites.length})
        </h2>
        {invites.length === 0 ? (
          <p className="text-sm text-[#1a3a2a]/60 py-6 text-center">
            Nenhum convite ainda.
          </p>
        ) : (
          <ul className="divide-y divide-[#e4ddd4]">
            {invites.map((inv) => {
              const expired = inv.status === "expired" || new Date(inv.expires_at) < new Date()
              const accepted = inv.status === "accepted"
              return (
                <li key={inv.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1a3a2a] truncate">{inv.patient_email}</p>
                    <p className="text-[11px] text-[#1a3a2a]/50 font-body">
                      {accepted
                        ? "Aceito"
                        : expired
                          ? `Expirado em ${new Date(inv.expires_at).toLocaleDateString("pt-BR")}`
                          : `Expira em ${new Date(inv.expires_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                  {!accepted && !expired && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyLink(inv.token, inv.id)}
                      className="rounded-xl gap-1.5"
                    >
                      {copiedId === inv.id ? (
                        <>
                          <Check className="w-3 h-3" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copiar link
                        </>
                      )}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
