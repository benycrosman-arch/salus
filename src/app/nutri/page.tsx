import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import Link from "next/link"
import { listInvitesForNutri } from "@/lib/nutri-invites"
import { PacientesRealtimeRefresher } from "./pacientes/realtime-refresher"

export const dynamic = "force-dynamic"

function initials(name: string | null | undefined, fallback: string) {
  const source = (name && name.trim()) || fallback
  const parts = source.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?"
}

function formatTimeAgo(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const now = Date.now()
  const diffMs = now - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "agora"
  if (diffMin < 60) return `${diffMin}min`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays === 1) return "Ontem"
  if (diffDays < 7) return `${diffDays}d`
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

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
      .select("name")
      .eq("id", user.id)
      .maybeSingle(),
  ])

  if (linksRes.error) console.error("nutri dashboard links query failed:", linksRes.error.message)
  if (invitesRes.error) console.error("nutri dashboard invites query failed:", invitesRes.error.message)
  if (profileRes.error) console.error("nutri dashboard profile query failed:", profileRes.error.message)

  const links = linksRes.data ?? []
  const nowMs = Date.now()
  const invites = (invitesRes.data ?? []).filter(
    (inv) => inv.status === "pending" && new Date(inv.expires_at).getTime() > nowMs,
  )

  let patients: { id: string; name: string | null; email: string | null }[] = []
  if (links.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", links.map((l) => l.patient_id))
    patients = data ?? []
  }

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
      const last = own.map((m) => m.logged_at).sort().at(-1) ?? null
      summaries.set(p.id, {
        avg7: avg,
        mealsCount: own.length,
        concerning,
        lastLoggedAt: last,
      })
    }
  }

  // Alerts shown in the AI co-pilot card: low adherence (avg7 < 50) or stale
  // logging (>3 days since last meal). Sorted by severity.
  const alerts = patients
    .map((p) => {
      const s = summaries.get(p.id)
      if (!s) return null
      const stale =
        s.lastLoggedAt
          ? Math.floor((nowMs - new Date(s.lastLoggedAt).getTime()) / 86_400_000)
          : null
      const lowAdherence = s.avg7 !== null && s.avg7 < 50
      const dropOff = stale !== null && stale >= 3
      if (!lowAdherence && !dropOff) return null
      return {
        patient: p,
        summary: s,
        reason: dropOff
          ? `Queda no registro de refeições há ${stale} dias.`
          : `Score médio em ${s.avg7}/100 nos últimos 7 dias.`,
        tag: dropOff ? "Adesão Crítica" : `${s.avg7}/100`,
        severity: dropOff ? "critical" : "warning",
      } as const
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1))
    .slice(0, 4)

  // Last 5 nutri↔paciente messages where the paciente was the sender — that's
  // the "Mensagens Recentes" surface (nutri responds to patient questions).
  const { data: recentMessages } = await supabase
    .from("nutri_chats")
    .select("id, patient_id, role, content, created_at")
    .eq("nutri_id", user.id)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(2)

  const messagesWithPatient = (recentMessages ?? []).map((m) => {
    const patient = patients.find((p) => p.id === m.patient_id)
    return { ...m, patient }
  })

  // Focus of the week: top 2 patients with best progress (highest avg7), tied
  // breaker = most meals logged. Empty state if no patients linked.
  const focusOfWeek = patients
    .map((p) => ({ p, s: summaries.get(p.id) }))
    .filter(({ s }) => s && s.avg7 !== null && s.mealsCount >= 3)
    .sort((a, b) => {
      const av = a.s!.avg7 ?? 0
      const bv = b.s!.avg7 ?? 0
      if (bv !== av) return bv - av
      return b.s!.mealsCount - a.s!.mealsCount
    })
    .slice(0, 2)

  const firstName = profileRes.data?.name?.split(" ")[0] || "doutor(a)"
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <>
      {/* Daily Overview */}
      <section className="mt-2">
        <div className="flex flex-col gap-1 mb-6">
          <h1 className="font-serif text-2xl text-[#1a3a2a]">Olá, {firstName}</h1>
          <p className="text-sm text-[#5e5e5c] capitalize">{today}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-6 rounded-xl border border-[#e4ddd4] flex flex-col gap-1">
            <span
              className="material-symbols-outlined text-[#2d4d3c]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              mail
            </span>
            <span className="font-serif text-5xl text-[#1a3a2a] leading-tight">
              {invites.length.toString().padStart(2, "0")}
            </span>
            <p className="text-xs text-[#5e5e5c] uppercase tracking-wider font-medium">
              Convites Pendentes
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-[#e4ddd4] flex flex-col gap-1">
            <span
              className="material-symbols-outlined text-[#e97e65]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              group
            </span>
            <span className="font-serif text-5xl text-[#1a3a2a] leading-tight">
              {patients.length.toString().padStart(2, "0")}
            </span>
            <p className="text-xs text-[#5e5e5c] uppercase tracking-wider font-medium">
              Pacientes Ativos
            </p>
          </div>
        </div>
      </section>

      {/* AI Co-pilot */}
      <section id="copiloto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[#e97e65]">psychology</span>
            <h2 className="font-serif text-2xl text-[#1a3a2a]">Co-piloto IA</h2>
          </div>
          {alerts.length > 0 && (
            <span className="bg-[#ffdad2] text-[#7d2c19] px-3 py-1 rounded-full text-xs font-medium tracking-wider uppercase">
              {alerts.length} Crítico{alerts.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {alerts.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-[#e4ddd4] text-center">
              <p className="text-sm text-[#5e5e5c]">Nenhum alerta crítico no momento.</p>
              <p className="text-xs text-[#5e5e5c]/70 mt-1">
                Todos os pacientes estão dentro dos parâmetros esperados.
              </p>
            </div>
          ) : (
            alerts.map(({ patient, reason, tag, severity }) => {
              const accent = severity === "critical" ? "#ba1a1a" : "#e97e65"
              return (
                <Link
                  key={patient.id}
                  href={`/nutri/pacientes/${patient.id}`}
                  className="bg-white p-6 rounded-xl border-y border-r border-[#e4ddd4] flex items-start gap-6 hover:bg-[#f6f3f2] transition-colors"
                  style={{ borderLeft: `4px solid ${accent}` }}
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-base font-bold text-[#1b1c1c]">
                        {patient.name || "Sem nome"}
                      </h3>
                      <span
                        className="text-xs font-bold tracking-wider uppercase"
                        style={{ color: accent }}
                      >
                        {tag}
                      </span>
                    </div>
                    <p className="text-sm text-[#5e5e5c]">{reason}</p>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 gap-2">
        <Link
          href="/nutri/pacientes"
          className="bg-[#1a3a2a] text-white w-full py-6 rounded-lg text-base font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-sm"
        >
          <span className="material-symbols-outlined">person_add</span>
          Novo Paciente
        </Link>
        <Link
          href="/nutri/protocolo"
          className="border-2 border-[#1a3a2a] text-[#1a3a2a] bg-transparent w-full py-6 rounded-lg text-base font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined">event</span>
          Editar Protocolo
        </Link>
      </section>

      {/* Recent Messages */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-2xl text-[#1a3a2a]">Mensagens Recentes</h2>
          <Link
            href="/nutri/pacientes"
            className="text-[#1a3a2a] text-xs uppercase tracking-wider font-bold"
          >
            Ver Todas
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-[#e4ddd4] overflow-hidden">
          {messagesWithPatient.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-[#5e5e5c]">Sem mensagens recentes.</p>
            </div>
          ) : (
            messagesWithPatient.map((m, i) => (
              <Link
                key={m.id}
                href={m.patient ? `/nutri/pacientes/${m.patient.id}` : "/nutri/pacientes"}
                className={`p-6 flex items-center gap-6 hover:bg-[#f6f3f2] transition-colors ${
                  i < messagesWithPatient.length - 1 ? "border-b border-[#e4ddd4]" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#c7ebd4] flex items-center justify-center text-[#002113] font-bold flex-shrink-0">
                  {initials(m.patient?.name, m.patient?.email || "?")}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between mb-1">
                    <h4 className="text-base font-bold text-[#1b1c1c] truncate">
                      {m.patient?.name || m.patient?.email || "Paciente"}
                    </h4>
                    <span className="text-xs text-[#5e5e5c] flex-shrink-0 ml-2">
                      {formatTimeAgo(m.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-[#5e5e5c] truncate">&ldquo;{m.content}&rdquo;</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Focus of the Week */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-2xl text-[#1a3a2a]">Foco da Semana</h2>
        </div>
        <div className="flex flex-col gap-2">
          {focusOfWeek.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-[#e4ddd4] text-center">
              <p className="text-sm text-[#5e5e5c]">
                Sem dados suficientes para destacar pacientes esta semana.
              </p>
              <p className="text-xs text-[#5e5e5c]/70 mt-1">
                Aparecem aqui pacientes com pelo menos 3 refeições registradas.
              </p>
            </div>
          ) : (
            focusOfWeek.map(({ p, s }) => (
              <Link
                key={p.id}
                href={`/nutri/pacientes/${p.id}`}
                className="bg-white p-6 rounded-xl border border-[#e4ddd4] flex items-center justify-between hover:bg-[#f6f3f2] transition-colors"
              >
                <div className="flex items-center gap-6">
                  <div className="w-10 h-10 rounded-full bg-[#c7ebd4] flex items-center justify-center text-[#002113] font-bold flex-shrink-0">
                    {initials(p.name, p.email || "?")}
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#1b1c1c]">
                      {p.name || "Sem nome"}
                    </p>
                    <p className="text-xs text-[#82a48f]">
                      Score 7d: {s!.avg7}/100 · {s!.mealsCount} refeições
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#5e5e5c]">chevron_right</span>
              </Link>
            ))
          )}
        </div>
      </section>

      <PacientesRealtimeRefresher nutriId={user.id} />
    </>
  )
}
