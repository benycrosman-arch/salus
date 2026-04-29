import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  XCircle,
  Mail,
  Phone,
  IdCard,
  ChevronRight,
} from "lucide-react"
import { SignOutButton } from "@/app/(app)/profile/sign-out-button"

export const dynamic = "force-dynamic"

type VerifyStatus = "verified" | "pending" | "manual_review" | "rejected" | "not_submitted" | null

const STATUS_META: Record<Exclude<VerifyStatus, null>, { icon: typeof ShieldCheck; label: string; pillBg: string; pillText: string }> = {
  verified:       { icon: ShieldCheck,   label: "Verificado",        pillBg: "bg-[#4a7c4a]/15", pillText: "text-[#4a7c4a]" },
  pending:        { icon: Clock,         label: "Em verificação",    pillBg: "bg-[#c4944a]/15", pillText: "text-[#c4944a]" },
  manual_review:  { icon: AlertTriangle, label: "Revisão humana",    pillBg: "bg-[#c4944a]/15", pillText: "text-[#c4944a]" },
  rejected:       { icon: XCircle,       label: "Não aprovado",      pillBg: "bg-[#c4614a]/15", pillText: "text-[#c4614a]" },
  not_submitted:  { icon: AlertTriangle, label: "Aguardando envio",  pillBg: "bg-[#1a3a2a]/10", pillText: "text-[#1a3a2a]" },
}

export default async function NutriConfigPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, phone, nutri_crn, nutri_crn_state, nutri_verification_status, nutri_verified_at, nutri_protocol")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) redirect("/onboarding-nutri")

  const status = (profile.nutri_verification_status ?? "not_submitted") as Exclude<VerifyStatus, null>
  const meta = STATUS_META[status]
  const StatusIcon = meta.icon

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl italic text-[#1a3a2a]">Configurações</h1>
        <p className="text-sm text-[#1a3a2a]/60 mt-1">Gerencie sua conta profissional e seus dados.</p>
      </div>

      {/* Verification status */}
      <Card className="border-0 shadow-md p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[#1a3a2a]/50">
              Verificação CRN
            </p>
            <p className="text-sm text-[#1a3a2a] mt-1">
              {profile.nutri_crn
                ? `${profile.nutri_crn}/${profile.nutri_crn_state ?? "—"}`
                : "Nenhum CRN cadastrado"}
            </p>
            {profile.nutri_verified_at && (
              <p className="text-[11px] text-[#1a3a2a]/50 mt-0.5">
                Verificado em {new Date(profile.nutri_verified_at).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.pillBg} ${meta.pillText}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {meta.label}
          </span>
        </div>
        {status !== "verified" && (
          <Link href={status === "not_submitted" ? "/onboarding-nutri" : "/nutri/aguardando-verificacao"}>
            <Button variant="outline" className="rounded-xl border-[#e4ddd4]">
              {status === "not_submitted" ? "Enviar certificado" : "Ver detalhes"}
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        )}
      </Card>

      {/* Account info */}
      <Card className="border-0 shadow-md p-6">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-[#1a3a2a]/50 mb-4">
          Dados da conta
        </p>
        <div className="space-y-3">
          <Row icon={IdCard} label="Nome" value={profile.name || "—"} />
          <Row icon={Mail} label="E-mail" value={profile.email || user.email || "—"} />
          <Row icon={Phone} label="Telefone" value={profile.phone || "—"} />
        </div>
      </Card>

      {/* Protocol shortcut */}
      <Card className="border-0 shadow-md p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-[#1a3a2a]/50">
            Seu protocolo
          </p>
          <Link href="/nutri/protocolo" className="text-xs text-[#c4614a] hover:underline">
            Editar
          </Link>
        </div>
        <p className="text-sm text-[#1a3a2a]/80 leading-relaxed font-body whitespace-pre-line">
          {profile.nutri_protocol?.slice(0, 280) || "Nenhum protocolo definido. Clique em editar para escrever instruções padrão para seus pacientes."}
          {profile.nutri_protocol && profile.nutri_protocol.length > 280 && "…"}
        </p>
      </Card>

      <Card className="border-0 shadow-md p-6 ring-1 ring-[#c4614a]/20">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-[#c4614a]/80 mb-2">
          Sessão
        </p>
        <p className="text-xs text-[#1a3a2a]/60 mb-4 font-body">
          Sair desconecta este dispositivo do painel do nutricionista.
        </p>
        <SignOutButton />
      </Card>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-[#1a3a2a]/40 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-[#1a3a2a]/50">{label}</p>
        <p className="text-sm text-[#1a3a2a] font-body truncate">{value}</p>
      </div>
    </div>
  )
}
