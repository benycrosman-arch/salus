import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import { isAdminEmail } from "@/lib/admin"
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FileText,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function AwaitingVerificationPage() {
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

  // Admins skip the CRN gate entirely — straight to the nutri panel.
  if (isAdminEmail(user.email)) redirect("/nutri")

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, nutri_crn, nutri_crn_state, nutri_verification_status, nutri_verification_data, nutri_verified_at")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) redirect("/onboarding-nutri")
  if (profile.nutri_verification_status === "verified") redirect("/nutri")

  const status = profile.nutri_verification_status as
    | "not_submitted"
    | "pending"
    | "rejected"
    | "manual_review"
    | "verified"
    | null

  const data = profile.nutri_verification_data as {
    decision?: { reason?: string }
    ai?: { rationale?: string; match_with_claim?: { name_matches?: boolean; crn_matches?: boolean } }
  } | null
  const reason = data?.decision?.reason ?? data?.ai?.rationale ?? null

  const meta = STATE[status ?? "not_submitted"]
  const Icon = meta.icon

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md p-8">
        <div className="flex items-start gap-5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${meta.iconWrap}`}>
            <Icon className={`w-6 h-6 ${meta.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[#1a3a2a]/50">
              {meta.eyebrow}
            </p>
            <h1 className="font-serif text-2xl italic text-[#1a3a2a] mt-1">
              {meta.title(profile.name?.split(" ")[0] || "doutor(a)")}
            </h1>
            <p className="mt-3 text-sm text-[#1a3a2a]/75 leading-relaxed font-body">
              {meta.body}
            </p>
            {reason && (
              <p className="mt-3 rounded-xl bg-[#1a3a2a]/[0.04] px-3 py-2 text-xs text-[#1a3a2a]/70 leading-relaxed font-body">
                <span className="font-semibold text-[#1a3a2a]">Detalhe:</span> {reason}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card className="border-0 shadow-md p-6">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-[#1a3a2a]/50 mb-3">
          Cadastro enviado
        </p>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <DataRow label="Nome" value={profile.name || "—"} />
          <DataRow
            label="CRN"
            value={
              profile.nutri_crn
                ? `${profile.nutri_crn}/${profile.nutri_crn_state ?? "—"}`
                : "—"
            }
          />
          <DataRow
            label="Status"
            value={
              <span className={`inline-flex items-center gap-1.5 ${meta.iconColor}`}>
                <Icon className="w-3.5 h-3.5" />
                {meta.eyebrow}
              </span>
            }
          />
          <DataRow
            label="Verificado em"
            value={
              profile.nutri_verified_at
                ? new Date(profile.nutri_verified_at).toLocaleString("pt-BR")
                : "—"
            }
          />
        </dl>
      </Card>

      <div className="flex gap-3 flex-wrap">
        {(status === "rejected" || status === "manual_review") && (
          <Link href="/onboarding-nutri">
            <Button className="rounded-full bg-[#1a3a2a] text-white hover:bg-[#1a3a2a]/90">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reenviar certificado
            </Button>
          </Link>
        )}
        <Link href="/profile">
          <Button variant="outline" className="rounded-full border-[#e4ddd4] text-[#1a3a2a]">
            <FileText className="w-4 h-4 mr-2" />
            Ver meu perfil
          </Button>
        </Link>
      </div>
    </div>
  )
}

const STATE = {
  not_submitted: {
    icon: ShieldCheck,
    iconWrap: "bg-[#1a3a2a]/10",
    iconColor: "text-[#1a3a2a]",
    eyebrow: "Cadastro incompleto",
    title: (n: string) => `Olá, ${n}`,
    body: "Você ainda não enviou seu certificado para verificação. Volte ao onboarding para finalizar.",
  },
  pending: {
    icon: Clock,
    iconWrap: "bg-[#c4944a]/15",
    iconColor: "text-[#c4944a]",
    eyebrow: "Verificação em andamento",
    title: (n: string) => `Estamos verificando, ${n}`,
    body: "Recebemos seu certificado e estamos confirmando seu CRN com o Conselho Federal de Nutricionistas. Isso costuma levar menos de um minuto. Se demorar mais, atualize a página.",
  },
  manual_review: {
    icon: AlertTriangle,
    iconWrap: "bg-[#c4944a]/15",
    iconColor: "text-[#c4944a]",
    eyebrow: "Em revisão humana",
    title: (n: string) => `Quase lá, ${n}`,
    body: "Nossa IA marcou sua submissão para revisão humana — geralmente porque a foto está pouco nítida ou um dado não bateu na consulta automática. Nossa equipe revisa em até 24h. Você também pode reenviar uma foto melhor.",
  },
  rejected: {
    icon: XCircle,
    iconWrap: "bg-[#c4614a]/15",
    iconColor: "text-[#c4614a]",
    eyebrow: "Verificação não aprovada",
    title: (n: string) => `${n}, precisamos rever`,
    body: "Não conseguimos confirmar sua credencial com os dados enviados. Confira se o nome e o número do CRN estão corretos e reenvie uma foto nítida do seu certificado oficial.",
  },
  verified: {
    icon: ShieldCheck,
    iconWrap: "bg-[#4a7c4a]/15",
    iconColor: "text-[#4a7c4a]",
    eyebrow: "Verificado",
    title: (n: string) => `Bem-vindo, ${n}`,
    body: "Sua credencial foi verificada. Acesse o painel para começar a acompanhar seus pacientes.",
  },
} as const

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-[#1a3a2a]/50 mb-0.5">{label}</dt>
      <dd className="text-sm text-[#1a3a2a] font-body">{value}</dd>
    </div>
  )
}
