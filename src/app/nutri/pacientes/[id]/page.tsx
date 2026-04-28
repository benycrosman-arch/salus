import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createServerClient } from "@supabase/ssr"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Activity,
  Mail,
  TrendingDown,
  TrendingUp,
  Utensils,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  Beaker,
} from "lucide-react"

export const dynamic = "force-dynamic"

type Params = { id: string }

export default async function PacientePage({ params }: { params: Promise<Params> }) {
  const { id: patientId } = await params

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

  // RLS already enforces "Nutris read linked patients ..." — but verify the
  // link exists so we can render a useful 404 instead of an empty page.
  const { data: link } = await supabase
    .from("nutri_patient_links")
    .select("status, created_at")
    .eq("nutri_id", user.id)
    .eq("patient_id", patientId)
    .eq("status", "active")
    .maybeSingle()

  if (!link) notFound()

  const since30Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const since30Iso = since30Date.toISOString()
  const since7Iso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [patientRes, mealsRes, labsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, height_cm, weight_kg, biological_sex, birth_date, city")
      .eq("id", patientId)
      .maybeSingle(),
    supabase
      .from("meals")
      .select("id, logged_at, meal_type, score, score_band, macros, foods_detected")
      .eq("user_id", patientId)
      .gte("logged_at", since30Iso)
      .order("logged_at", { ascending: false })
      .limit(120),
    supabase
      .from("lab_results")
      .select("marker, value, unit, reference_min, reference_max, measured_at")
      .eq("user_id", patientId)
      .order("measured_at", { ascending: false })
      .limit(8),
  ])

  const patient = patientRes.data
  if (!patient) notFound()

  const meals = mealsRes.data ?? []
  const labs = labsRes.data ?? []

  // Daily stats and user_preferences are owner-only via RLS, so derive
  // everything we can from meals (which the nutri can read for linked patients).
  const dailyMap = new Map<string, { date: string; sum: number; count: number }>()
  for (const m of meals) {
    const date = m.logged_at.slice(0, 10)
    const cur = dailyMap.get(date) ?? { date, sum: 0, count: 0 }
    cur.sum += m.score ?? 0
    cur.count += 1
    dailyMap.set(date, cur)
  }
  const daily = Array.from(dailyMap.values())
    .map((d) => ({ date: d.date, avg_score: Math.round(d.sum / d.count), meals_count: d.count }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const last7 = meals.filter((m) => m.logged_at >= since7Iso)
  const avg7 =
    last7.length > 0 ? Math.round(last7.reduce((s, m) => s + (m.score ?? 0), 0) / last7.length) : null
  const avg30 =
    meals.length > 0 ? Math.round(meals.reduce((s, m) => s + (m.score ?? 0), 0) / meals.length) : null
  const trend = avg7 !== null && avg30 !== null ? avg7 - avg30 : null
  const lowScore = avg7 !== null && avg7 < 50

  const totalMeals30 = meals.length
  const concerningMeals = meals.filter(
    (m) => m.score_band === "atencao" || m.score_band === "evitar",
  )

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/nutri/pacientes"
          className="inline-flex items-center gap-1.5 text-xs text-[#1a3a2a]/60 hover:text-[#1a3a2a] mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para pacientes
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl italic text-[#1a3a2a]">
              {patient.name || "Paciente"}
            </h1>
            <div className="text-sm text-[#1a3a2a]/60 mt-1 flex flex-wrap gap-x-4 gap-y-1 font-body">
              {patient.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {patient.email}
                </span>
              )}
              {patient.city && <span>{patient.city}</span>}
            </div>
          </div>
        </div>
      </div>

      {lowScore && <LowScoreAlert avg7={avg7!} concerningCount={concerningMeals.length} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          icon={Activity}
          label="Score 7 dias"
          value={avg7 !== null ? `${avg7}/100` : "—"}
          accent={
            avg7 === null
              ? "neutral"
              : avg7 < 50
                ? "danger"
                : avg7 < 70
                  ? "warn"
                  : "ok"
          }
          hint={
            trend !== null
              ? trend > 0
                ? `+${trend} vs. 30 dias`
                : `${trend} vs. 30 dias`
              : undefined
          }
        />
        <KpiCard
          icon={Utensils}
          label="Refeições registradas"
          value={totalMeals30}
          hint="últimos 30 dias"
        />
        <KpiCard
          icon={Calendar}
          label="Score 30 dias"
          value={avg30 !== null ? `${avg30}/100` : "—"}
          hint={`${daily.length} dias com registros`}
        />
      </div>

      {/* Daily summary */}
      <Card className="border-0 shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#1a3a2a]">Resumo diário</h2>
          <span className="text-xs text-[#1a3a2a]/40 font-body">últimos 14 dias</span>
        </div>
        {daily.length === 0 ? (
          <EmptyState message="Sem registros nos últimos 30 dias." />
        ) : (
          <ul className="grid grid-cols-7 gap-1.5">
            {fillLastNDays(14, dailyMap).map((d) => (
              <DayCell key={d.date} date={d.date} avg={d.avg_score} count={d.meals_count} />
            ))}
          </ul>
        )}
      </Card>

      {/* Concerning meals */}
      {concerningMeals.length > 0 && (
        <Card className="border-0 shadow-md p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[#c4614a]" />
            <h2 className="text-sm font-semibold text-[#1a3a2a]">
              Refeições para revisar ({concerningMeals.length})
            </h2>
          </div>
          <ul className="divide-y divide-[#e4ddd4]">
            {concerningMeals.slice(0, 6).map((m) => (
              <MealRow key={m.id} meal={m} />
            ))}
          </ul>
        </Card>
      )}

      {/* All recent meals */}
      <Card className="border-0 shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#1a3a2a]">Refeições recentes</h2>
          <span className="text-xs text-[#1a3a2a]/40 font-body">{meals.length} no período</span>
        </div>
        {meals.length === 0 ? (
          <EmptyState message="Sem refeições registradas ainda." />
        ) : (
          <ul className="divide-y divide-[#e4ddd4]">
            {meals.slice(0, 12).map((m) => (
              <MealRow key={m.id} meal={m} />
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile */}
        <Card className="border-0 shadow-md p-6">
          <h2 className="text-sm font-semibold text-[#1a3a2a] mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Perfil clínico
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm font-body">
            <Field label="Sexo" value={prettySex(patient.biological_sex)} />
            <Field label="Idade" value={ageFromDob(patient.birth_date)} />
            <Field label="Altura" value={patient.height_cm ? `${patient.height_cm} cm` : "—"} />
            <Field label="Peso" value={patient.weight_kg ? `${patient.weight_kg} kg` : "—"} />
            <Field label="Cidade" value={patient.city || "—"} />
          </dl>
          <p className="text-[11px] text-[#1a3a2a]/40 font-body mt-4">
            Objetivos, dieta e alergias são acessíveis ao paciente em Configurações; peça ao paciente
            para compartilhar via mensagem se precisar dessas informações antes da consulta.
          </p>
        </Card>

        {/* Labs */}
        <Card className="border-0 shadow-md p-6">
          <h2 className="text-sm font-semibold text-[#1a3a2a] mb-4 flex items-center gap-2">
            <Beaker className="w-4 h-4" />
            Exames recentes
          </h2>
          {labs.length === 0 ? (
            <EmptyState message="Nenhum exame registrado." />
          ) : (
            <ul className="space-y-2 text-sm font-body">
              {labs.map((l, i) => {
                const out =
                  (l.reference_min !== null && l.value < l.reference_min) ||
                  (l.reference_max !== null && l.value > l.reference_max)
                return (
                  <li
                    key={i}
                    className="flex items-baseline justify-between gap-3 py-1.5 border-b border-[#e4ddd4] last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[#1a3a2a] truncate">{l.marker}</p>
                      <p className="text-[11px] text-[#1a3a2a]/40">
                        {new Date(l.measured_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className={`text-sm font-medium ${out ? "text-[#c4614a]" : "text-[#1a3a2a]"}`}>
                      {l.value} {l.unit}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/nutri/pacientes">Outros pacientes</Link>
        </Button>
      </div>
    </div>
  )
}

function fillLastNDays(
  n: number,
  map: Map<string, { date: string; sum: number; count: number }>,
) {
  const out: { date: string; avg_score: number | null; meals_count: number }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    const date = d.toISOString().slice(0, 10)
    const v = map.get(date)
    out.push({
      date,
      avg_score: v ? Math.round(v.sum / v.count) : null,
      meals_count: v?.count ?? 0,
    })
  }
  return out
}

function LowScoreAlert({ avg7, concerningCount }: { avg7: number; concerningCount: number }) {
  return (
    <div className="rounded-2xl border border-[#c4614a]/30 bg-[#c4614a]/5 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#c4614a] mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-[#1a3a2a]">
            Score baixo nos últimos 7 dias ({avg7}/100)
          </h3>
          <p className="text-xs text-[#1a3a2a]/70 mt-1 font-body leading-relaxed">
            {concerningCount > 0
              ? `${concerningCount} refeições marcadas como "atenção" ou "evitar" no período. Vale revisar com o paciente antes da próxima consulta.`
              : "Vale conversar com o paciente sobre adesão ao plano antes da próxima consulta."}
          </p>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "neutral",
}: {
  icon: typeof Activity
  label: string
  value: string | number
  hint?: string
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
      {hint && (
        <div className="text-[11px] text-[#1a3a2a]/40 font-body mt-1 inline-flex items-center gap-1">
          {hint.startsWith("+") ? (
            <TrendingUp className="w-3 h-3" />
          ) : hint.startsWith("-") ? (
            <TrendingDown className="w-3 h-3" />
          ) : null}
          {hint}
        </div>
      )}
    </Card>
  )
}

function DayCell({
  date,
  avg,
  count,
}: {
  date: string
  avg: number | null
  count: number | null
}) {
  const score = avg ?? 0
  const bg =
    avg === null
      ? "bg-[#e4ddd4]/40 text-[#1a3a2a]/40"
      : score >= 70
        ? "bg-[#4a7c4a]/80 text-white"
        : score >= 50
          ? "bg-[#c4944a]/70 text-white"
          : "bg-[#c4614a]/70 text-white"
  return (
    <li
      className={`rounded-lg p-2 text-center ${bg}`}
      title={`${date}: ${avg ?? "sem registro"} (${count ?? 0} ref.)`}
    >
      <div className="text-[10px] opacity-80">
        {new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
      </div>
      <div className="text-sm font-semibold">{avg ?? "—"}</div>
    </li>
  )
}

type Meal = {
  id: string
  logged_at: string
  meal_type: string | null
  score: number
  score_band: string | null
  macros: { calories?: number; protein?: number } | null
  foods_detected: { name?: string }[] | null
}

function MealRow({ meal }: { meal: Meal }) {
  const mealLabel: Record<string, string> = {
    breakfast: "Café",
    snack1: "Lanche manhã",
    lunch: "Almoço",
    snack2: "Lanche tarde",
    dinner: "Jantar",
    other: "Refeição",
  }
  const summary =
    (meal.foods_detected ?? [])
      .slice(0, 3)
      .map((f) => f?.name)
      .filter(Boolean)
      .join(" · ") || "Sem itens detectados"
  const bandColor: Record<string, string> = {
    excelente: "bg-[#4a7c4a]/15 text-[#4a7c4a]",
    otimo: "bg-[#4a7c4a]/10 text-[#4a7c4a]",
    bom: "bg-[#c4944a]/15 text-[#c4944a]",
    atencao: "bg-[#c4614a]/15 text-[#c4614a]",
    evitar: "bg-[#c4614a]/25 text-[#c4614a]",
  }
  return (
    <li className="py-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#1a3a2a]">
          <span className="font-medium">{mealLabel[meal.meal_type ?? "other"] ?? "Refeição"}</span>{" "}
          <span className="text-[#1a3a2a]/40 font-body text-xs">
            ·{" "}
            {new Date(meal.logged_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </p>
        <p className="text-xs text-[#1a3a2a]/60 truncate font-body">{summary}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {meal.macros?.calories ? (
          <span className="text-xs text-[#1a3a2a]/60 font-body">
            {Math.round(meal.macros.calories)} kcal
          </span>
        ) : null}
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
            bandColor[meal.score_band ?? "bom"] ?? "bg-[#1a3a2a]/10 text-[#1a3a2a]"
          }`}
        >
          {meal.score}
        </span>
      </div>
    </li>
  )
}

function Field({ label, value, span = 1 }: { label: string; value: string; span?: 1 | 2 }) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <dt className="text-[11px] uppercase tracking-wider text-[#1a3a2a]/40">{label}</dt>
      <dd className="text-sm text-[#1a3a2a] mt-0.5">{value}</dd>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-[#1a3a2a]/50 py-6 text-center font-body">{message}</p>
}

function prettySex(s: string | null | undefined) {
  if (!s) return "—"
  return { male: "Masculino", female: "Feminino", other: "Outro" }[s] ?? "—"
}

function ageFromDob(dob: string | null | undefined) {
  if (!dob) return "—"
  const ms = Date.now() - new Date(dob).getTime()
  const years = Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000))
  return years > 0 && years < 130 ? `${years} anos` : "—"
}
