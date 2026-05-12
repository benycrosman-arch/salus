"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Loader2,
  Mail,
  Copy,
  Check,
  Activity,
  AlertTriangle,
  Moon,
  Send,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { track } from "@/lib/posthog"

export type PatientColumn = "engajado" | "atencao" | "inativo"

export type Patient = {
  id: string
  name: string | null
  email: string | null
  mealsCount7d: number
  avgScore7d: number | null
  lastLoggedAt: string | null
  column: PatientColumn
}

export type Invite = {
  id: string
  patient_email: string
  created_at: string
  expires_at: string
  token: string
  status?: string
}

const COLUMN_CONFIG: Record<
  "convite" | PatientColumn,
  { title: string; subtitle: string; icon: typeof Activity; bg: string; ring: string; pill: string }
> = {
  convite: {
    title: "Convites pendentes",
    subtitle: "Aguardando aceite",
    icon: Send,
    bg: "bg-[#1a3a2a]/[0.04]",
    ring: "ring-[#1a3a2a]/10",
    pill: "bg-[#1a3a2a]/10 text-[#1a3a2a]",
  },
  engajado: {
    title: "Engajados",
    subtitle: "Score bom, logando direto",
    icon: Activity,
    bg: "bg-[#4a7c4a]/[0.06]",
    ring: "ring-[#4a7c4a]/15",
    pill: "bg-[#4a7c4a]/15 text-[#4a7c4a]",
  },
  atencao: {
    title: "Atenção",
    subtitle: "Score baixo ou pouco log",
    icon: AlertTriangle,
    bg: "bg-[#c4944a]/[0.06]",
    ring: "ring-[#c4944a]/20",
    pill: "bg-[#c4944a]/15 text-[#c4944a]",
  },
  inativo: {
    title: "Inativos",
    subtitle: "Sem log há mais de 7 dias",
    icon: Moon,
    bg: "bg-[#c4614a]/[0.05]",
    ring: "ring-[#c4614a]/15",
    pill: "bg-[#c4614a]/15 text-[#c4614a]",
  },
}

function timeAgoPt(iso: string | null): string {
  if (!iso) return "nunca"
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 60) return `há ${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  const days = Math.round(hrs / 24)
  if (days < 30) return `há ${days}d`
  const months = Math.round(days / 30)
  return `há ${months}mês${months > 1 ? "es" : ""}`
}

export function PacientesClient({
  patients,
  pendingInvites,
  historyInvites,
}: {
  patients: Patient[]
  pendingInvites: Invite[]
  historyInvites: Invite[]
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const out: Record<PatientColumn, Patient[]> = { engajado: [], atencao: [], inativo: [] }
    for (const p of patients) out[p.column].push(p)
    // Sort: engajados by most recent log first; atenção by lowest score first;
    // inativos by oldest log first (most urgent re-engagement).
    out.engajado.sort((a, b) => (b.lastLoggedAt ?? "").localeCompare(a.lastLoggedAt ?? ""))
    out.atencao.sort((a, b) => (a.avgScore7d ?? 100) - (b.avgScore7d ?? 100))
    out.inativo.sort((a, b) => (a.lastLoggedAt ?? "").localeCompare(b.lastLoggedAt ?? ""))
    return out
  }, [patients])

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
      track("nutri_invite_sent", {
        method: "email",
        delivered: !!body.emailSent,
      })
      if (body.emailSent) {
        toast.success(`Convite enviado para ${email}`)
      } else {
        toast.success(`Convite criado para ${email}. Copie o link e envie manualmente.`)
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
        <div className="mt-3">
          <Button
            onClick={sendInvite}
            disabled={sending || !email.trim()}
            className="w-full sm:w-auto"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4 mr-2" />Enviar convite</>}
          </Button>
        </div>
      </Card>

      {/* Kanban */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="grid grid-flow-col auto-cols-[85%] sm:auto-cols-auto sm:grid-cols-4 gap-4 min-w-min">
          <InviteColumn
            invites={pendingInvites}
            copiedId={copiedId}
            onCopy={copyLink}
          />
          <PatientColumnCard column="engajado" patients={grouped.engajado} />
          <PatientColumnCard column="atencao" patients={grouped.atencao} />
          <PatientColumnCard column="inativo" patients={grouped.inativo} />
        </div>
      </div>

      {/* Invite history */}
      {historyInvites.length > 0 && (
        <Card className="border-0 shadow-md p-5">
          <h2 className="text-sm font-semibold text-[#1a3a2a] mb-3">
            Histórico de convites ({historyInvites.length})
          </h2>
          <ul className="divide-y divide-[#e4ddd4]">
            {historyInvites.map((inv) => {
              const accepted = inv.status === "accepted"
              const expired = !accepted
              return (
                <li key={inv.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#1a3a2a] truncate">{inv.patient_email}</span>
                  <span className={`text-[11px] ${accepted ? "text-[#4a7c4a]" : "text-[#1a3a2a]/40"}`}>
                    {accepted ? "Aceito" : expired ? "Expirado" : inv.status}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}

function PatientColumnCard({ column, patients }: { column: PatientColumn; patients: Patient[] }) {
  const cfg = COLUMN_CONFIG[column]
  const Icon = cfg.icon
  return (
    <div className={`rounded-2xl ${cfg.bg} ring-1 ${cfg.ring} p-3 flex flex-col`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 text-[#1a3a2a]/60 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#1a3a2a] truncate">{cfg.title}</p>
            <p className="text-[10px] text-[#1a3a2a]/50 truncate">{cfg.subtitle}</p>
          </div>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.pill}`}>
          {patients.length}
        </span>
      </div>
      <div className="space-y-2 min-h-[60px]">
        {patients.length === 0 ? (
          <p className="text-[11px] text-[#1a3a2a]/40 text-center py-6 font-body">Vazio</p>
        ) : (
          patients.map((p) => (
            <Link
              key={p.id}
              href={`/nutri/pacientes/${p.id}`}
              className="block bg-white rounded-xl p-3 ring-1 ring-black/[0.04] shadow-sm hover:shadow-md hover:ring-[#1a3a2a]/15 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-[#1a3a2a] truncate flex-1">
                  {p.name || "Sem nome"}
                </p>
                {p.avgScore7d !== null && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${cfg.pill} flex-shrink-0`}>
                    {p.avgScore7d}
                  </span>
                )}
              </div>
              {p.email && (
                <p className="text-[11px] text-[#1a3a2a]/50 font-body truncate mt-0.5">{p.email}</p>
              )}
              <div className="flex items-center gap-2 mt-2 text-[10px] text-[#1a3a2a]/55 font-body">
                <span>{p.mealsCount7d} log{p.mealsCount7d === 1 ? "" : "s"} / 7d</span>
                <span className="text-[#1a3a2a]/20">·</span>
                <span>{timeAgoPt(p.lastLoggedAt)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

function InviteColumn({
  invites,
  copiedId,
  onCopy,
}: {
  invites: Invite[]
  copiedId: string | null
  onCopy: (token: string, id: string) => void
}) {
  const cfg = COLUMN_CONFIG.convite
  const Icon = cfg.icon
  return (
    <div className={`rounded-2xl ${cfg.bg} ring-1 ${cfg.ring} p-3 flex flex-col`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 text-[#1a3a2a]/60 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#1a3a2a] truncate">{cfg.title}</p>
            <p className="text-[10px] text-[#1a3a2a]/50 truncate">{cfg.subtitle}</p>
          </div>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.pill}`}>
          {invites.length}
        </span>
      </div>
      <div className="space-y-2 min-h-[60px]">
        {invites.length === 0 ? (
          <p className="text-[11px] text-[#1a3a2a]/40 text-center py-6 font-body">Vazio</p>
        ) : (
          invites.map((inv) => (
            <div
              key={inv.id}
              className="bg-white rounded-xl p-3 ring-1 ring-black/[0.04] shadow-sm"
            >
              <p className="text-sm font-medium text-[#1a3a2a] truncate">{inv.patient_email}</p>
              <p className="text-[10px] text-[#1a3a2a]/50 font-body mt-0.5">
                Expira em {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
              </p>
              <button
                onClick={() => onCopy(inv.token, inv.id)}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#c4614a] hover:underline"
              >
                {copiedId === inv.id ? (
                  <><Check className="w-3 h-3" /> Copiado</>
                ) : (
                  <><Copy className="w-3 h-3" /> Copiar link</>
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
