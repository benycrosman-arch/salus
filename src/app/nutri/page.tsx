import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { Card } from "@/components/ui/card"
import {
  Users,
  Mail,
  FileText,
  AlertTriangle,
  Activity,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { listInvitesForNutri } from "@/lib/nutri-invites"

export const dynamic = "force-dynamic"

export default async function NutriDashboardPage() {
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
  if (!user) redirect("/auth/login?redirectTo=/nutri")

  const [linksRes, invitesRes, profileRes] = await Promise.all([
    supabase
      .from("nutri_patient_links")
      .select("patient_id, status, created_at")
      .eq("nutri_id", user.id)
      .eq("status", "active"),
    listInvitesForNutri(supabase, user.id, 50),
    supabase
      .from("profiles")
      .select("nutri_protocol, name")
      .eq("id", user.id)
      .maybeSingle(),
  ])

  // Surface RLS / connectivity issues in logs — silently coercing to [] hides
  // policy regressions and makes the dashboard look fine while data is missing.
  if (linksRes.error) console.error("nutri dashboard links query failed:", linksRes.error.message)
  if (invitesRes.error) console.error("nutri dashboard invites query failed:", invitesRes.error.message)
  if (profileRes.error) console.error("nutri dashboard profile query failed:", profileRes.error.message)

  const links = linksRes.data ?? []
  const nowMs = Date.now()
  const invites = (invitesRes.data ?? []).filter(
    (inv) => inv.status === "pending" && new Date(inv.expires_at).getTime() > nowMs,
  )

  // Hydrate patient profiles
  let patients: { id: string; name: string | null; email: string | null }[] = []
  if (links.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", links.map((l) => l.patient_id))
    patients = data ?? []
  }

  // Daily stats for the last 7 days for every linked patient. RLS gives us
  // access via "Nutris read linked patients meals" — daily_stats is owner-only,
  // so derive the last-7-day average from meals directly.
  const since7Iso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  type Summary = {
    avg7: number | null
    mealsCount: number
    concerning: number
    lastLoggedAt: string | null
  }
  const summaries = new Map<string, Summary>()

  if (patients.length > 0) {
    const { data: recentMeals } = await supabase
      .from("meals")
      .select("user_id, score, score_band, logged_at")
      .in("user_id", patients.map((p) => p.id))
      .gte("logged_at", since7Iso)

    for (const p of patients) {
      const own = (recentMeals ?? []).filter((m) => m.user_id === p.id)
      const avg =
        own.length > 0 ? Math.round(own.reduce((s, m) => s + (m.score ?? 0), 0) / own.length) : null
      const concerning = own.filter(
        (m) => m.score_band === "atencao" || m.score_band === "evitar",
      ).length
      const last = own
        .map((m) => m.logged_at)
        .sort()
        .at(-1) ?? null
      summaries.set(p.id, {
        avg7: avg,
        mealsCount: own.length,
        concerning,
        lastLoggedAt: last,
      })
    }
  }

  const alerts = patients
    .map((p) => ({ patient: p, summary: summaries.get(p.id) }))
    .filter(({ summary }) => summary && summary.avg7 !== null && summary.avg7 < 50)
    .sort((a, b) => (a.summary!.avg7 ?? 0) - (b.summary!.avg7 ?? 0))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl italic text-[#1a3a2a]">
          Olá, {profileRes.data?.name?.split(" ")[0] || "doutor(a)"}
        </h1>
        <p className="text-sm text-[#1a3a2a]/60 mt-1">
          Acompanhe seus pacientes e seu protocolo de atendimento.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={Users} label="Pacientes ativos" value={patients.length} />
        <KpiCard icon={Mail} label="Convites pendentes" value={invites.length} />
        <KpiCard
          icon={AlertTriangle}
          label="Alertas (score baixo)"
          value={alerts.length}
          accent={alerts.length > 0 ? "danger" : "ok"}
        />
      </div>

      {/* Low-score alerts — surfaced only when at least one patient is in trouble */}
      {alerts.length > 0 && (
        <Card className="border-0 shadow-md p-6 ring-1 ring-[#c4614a]/20 bg-[#c4614a]/[0.03]">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[#c4614a]" />
            <h2 className="text-sm font-semibold text-[#1a3a2a]">
              Pacientes precisando de atenção
            </h2>
          </div>
          <ul className="divide-y divide-[#e4ddd4]">
            {alerts.map(({ patient, summary }) => (
              <li key={patient.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#1a3a2a] truncate">
                    {patient.name || "Sem nome"}
                  </p>
                  <p className="text-xs text-[#1a3a2a]/60 font-body">
                    Score 7d: <span className="font-semibold text-[#c4614a]">{summary!.avg7}/100</span>
                    {" · "}
                    {summary!.mealsCount} refeições · {summary!.concerning} marcadas para revisão
                  </p>
                </div>
                <Link
                  href={`/nutri/pacientes/${patient.id}`}
                  className="text-xs text-[#c4614a] hover:underline whitespace-nowrap"
                >
                  Ver resumo →
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Protocol preview */}
      <Card className="border-0 shadow-md p-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-[#1a3a2a]" />
          <h2 className="text-sm font-semibold text-[#1a3a2a]">Seu protocolo</h2>
          <Link href="/nutri/protocolo" className="ml-auto text-xs text-[#c4614a] hover:underline">
            Editar
          </Link>
        </div>
        <p className="text-sm text-[#1a3a2a]/80 leading-relaxed font-body whitespace-pre-line">
          {profileRes.data?.nutri_protocol?.slice(0, 400) || "Sem protocolo definido."}
          {profileRes.data?.nutri_protocol && profileRes.data.nutri_protocol.length > 400 && "..."}
        </p>
      </Card>

      {/* Patients list */}
      <Card className="border-0 shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#1a3a2a]">Pacientes</h2>
          <Link href="/nutri/pacientes">
            <Button size="sm" variant="outline" className="rounded-xl">
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              Convidar paciente
            </Button>
          </Link>
        </div>

        {patients.length === 0 ? (
          <div className="py-10 text-center">
            <Users className="w-10 h-10 text-[#1a3a2a]/20 mx-auto mb-3" />
            <p className="text-sm text-[#1a3a2a]/60">
              Nenhum paciente vinculado ainda.
            </p>
            <p className="text-xs text-[#1a3a2a]/40 mt-1">
              Use a aba <b>Pacientes</b> para enviar um convite por e-mail.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#e4ddd4]">
            {patients.map((p) => {
              const summary = summaries.get(p.id)
              const avg = summary?.avg7 ?? null
              const accent =
                avg === null ? "neutral" : avg < 50 ? "danger" : avg < 70 ? "warn" : "ok"
              return (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1a3a2a] truncate">
                      {p.name || "Sem nome"}
                    </p>
                    <p className="text-xs text-[#1a3a2a]/50 font-body truncate">{p.email}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <ScorePill avg={avg} accent={accent} count={summary?.mealsCount ?? 0} />
                    <Link
                      href={`/nutri/pacientes/${p.id}`}
                      className="text-xs text-[#c4614a] hover:underline"
                    >
                      Ver perfil →
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {invites.length > 0 && (
        <Card className="border-0 shadow-md p-6">
          <h2 className="text-sm font-semibold text-[#1a3a2a] mb-3">Convites pendentes</h2>
          <ul className="divide-y divide-[#e4ddd4] text-sm">
            {invites.map((inv) => (
              <li key={inv.id} className="py-2 flex items-center justify-between">
                <span className="text-[#1a3a2a]/80 font-body">{inv.patient_email}</span>
                <span className="text-xs text-[#1a3a2a]/40">
                  expira em {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent = "neutral",
}: {
  icon: typeof Users
  label: string
  value: string | number
  accent?: "ok" | "warn" | "danger" | "neutral"
}) {
  const accentColor = {
    ok: "text-[#4a7c4a]",
    warn: "text-[#c4944a]",
    danger: "text-[#c4614a]",
    neutral: "text-[#1a3a2a]",
  }[accent]
  return (
    <Card className="border-0 shadow-md p-5">
      <Icon className="w-4 h-4 text-[#1a3a2a]/60 mb-2" />
      <div className={`text-2xl font-bold ${accentColor}`}>{value}</div>
      <div className="text-xs text-[#1a3a2a]/60 font-body mt-0.5">{label}</div>
    </Card>
  )
}

function ScorePill({
  avg,
  accent,
  count,
}: {
  avg: number | null
  accent: "ok" | "warn" | "danger" | "neutral"
  count: number
}) {
  if (avg === null) {
    return (
      <span className="text-[11px] text-[#1a3a2a]/40 font-body inline-flex items-center gap-1">
        <Activity className="w-3 h-3" />
        sem dados
      </span>
    )
  }
  const palette = {
    ok: "bg-[#4a7c4a]/15 text-[#4a7c4a]",
    warn: "bg-[#c4944a]/15 text-[#c4944a]",
    danger: "bg-[#c4614a]/20 text-[#c4614a]",
    neutral: "bg-[#1a3a2a]/10 text-[#1a3a2a]",
  }[accent]
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${palette}`}
      title={`${count} refeições registradas nos últimos 7 dias`}
    >
      {avg}/100
    </span>
  )
}

