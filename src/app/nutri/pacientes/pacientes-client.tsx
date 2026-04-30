"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, Copy, Check, Users, MessageCircle } from "lucide-react"
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
  const [phone, setPhone] = useState("")
  const [sending, setSending] = useState(false)
  const [sendingWa, setSendingWa] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const sendInvite = async (channel: "email" | "whatsapp") => {
    if (!email.trim()) return
    if (channel === "whatsapp" && !phone.trim()) {
      toast.error("Telefone obrigatório para enviar via WhatsApp.")
      return
    }
    if (channel === "whatsapp") setSendingWa(true)
    else setSending(true)
    try {
      const res = await fetch("/api/nutri/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone: channel === "whatsapp" ? phone : undefined,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error || "Falha ao convidar")
        return
      }
      track("nutri_invite_sent", {
        method: channel,
        delivered: channel === "whatsapp" ? !!body.waMeUrl : !!body.emailSent,
      })
      if (channel === "whatsapp" && body.waMeUrl) {
        // Open WhatsApp pre-filled with the message + invite link.
        window.open(body.waMeUrl, "_blank", "noopener,noreferrer")
        toast.success(`WhatsApp aberto para ${phone}. Confirme o envio.`)
      } else if (body.emailSent) {
        toast.success(`Convite enviado para ${email}`)
      } else {
        toast.success(
          `Convite criado para ${email}. Copie o link e envie por WhatsApp ou e-mail.`,
        )
      }
      setEmail("")
      setPhone("")
      router.refresh()
    } catch {
      toast.error("Erro de rede")
    } finally {
      setSending(false)
      setSendingWa(false)
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label htmlFor="invite-email" className="text-xs text-[#1a3a2a]/70">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="paciente@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="invite-phone" className="text-xs text-[#1a3a2a]/70">
              Celular <span className="text-[#1a3a2a]/40">(opcional, para WhatsApp)</span>
            </Label>
            <Input
              id="invite-phone"
              type="tel"
              inputMode="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <Button
            onClick={() => sendInvite("whatsapp")}
            disabled={sendingWa || sending || !email.trim() || !phone.trim()}
            className="bg-[#25D366] hover:bg-[#20bf5a] text-white flex-1 sm:flex-initial"
          >
            {sendingWa ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <MessageCircle className="w-4 h-4 mr-2" />
                Enviar via WhatsApp
              </>
            )}
          </Button>
          <Button
            onClick={() => sendInvite("email")}
            disabled={sending || sendingWa || !email.trim()}
            variant="outline"
            className="flex-1 sm:flex-initial"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Enviar por e-mail
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-[#1a3a2a]/50 mt-3 font-body">
          O WhatsApp abre com a mensagem pronta — basta confirmar o envio.
          Sem celular, mandamos um e-mail (e você ainda pode copiar o link abaixo).
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
