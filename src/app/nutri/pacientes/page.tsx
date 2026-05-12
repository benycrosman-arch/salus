import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { PacientesClient, type Patient, type PatientColumn, type Invite } from "./pacientes-client"
import { listInvitesForNutri } from "@/lib/nutri-invites"

export const dynamic = "force-dynamic"

const DAY_MS = 24 * 60 * 60 * 1000

function classifyPatient(args: {
  mealsCount7d: number
  avgScore7d: number | null
  lastLoggedAt: string | null
}): PatientColumn {
  const { mealsCount7d, avgScore7d, lastLoggedAt } = args
  const now = Date.now()
  const lastMs = lastLoggedAt ? new Date(lastLoggedAt).getTime() : null
  const daysSinceLast = lastMs == null ? Infinity : (now - lastMs) / DAY_MS

  if (daysSinceLast > 7) return "inativo"
  if (avgScore7d != null && avgScore7d < 70) return "atencao"
  if (daysSinceLast >= 3) return "atencao"
  if (mealsCount7d === 0) return "atencao"
  return "engajado"
}

export default async function PacientesPage() {
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
  if (!user) redirect("/auth/login?redirectTo=/nutri/pacientes")

  const [linksRes, invitesRes] = await Promise.all([
    supabase
      .from("nutri_patient_links")
      .select("patient_id, status, created_at")
      .eq("nutri_id", user.id)
      .eq("status", "active"),
    listInvitesForNutri(supabase, user.id, 50),
  ])

  if (linksRes.error) console.error("pacientes: links query failed:", linksRes.error.message)
  if (invitesRes.error) console.error("pacientes: invites query failed:", invitesRes.error.message)

  const links = linksRes.data ?? []
  const allInvites = invitesRes.data ?? []

  // Hydrate patient profiles
  let profileRows: { id: string; name: string | null; email: string | null }[] = []
  if (links.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", links.map((l) => l.patient_id))
    profileRows = data ?? []
  }

  // Last-7-day meal stats per patient. RLS already restricts to linked patients
  // via the "Nutris read linked patients meals" policy.
  const since7Iso = new Date(Date.now() - 7 * DAY_MS).toISOString()
  const statsByPatient = new Map<
    string,
    { mealsCount: number; avgScore: number | null; lastLoggedAt: string | null }
  >()
  if (profileRows.length > 0) {
    const { data: meals } = await supabase
      .from("meals")
      .select("user_id, score, logged_at")
      .in("user_id", profileRows.map((p) => p.id))
      .gte("logged_at", since7Iso)
    for (const p of profileRows) {
      const own = (meals ?? []).filter((m) => m.user_id === p.id)
      const avg = own.length > 0
        ? Math.round(own.reduce((s, m) => s + (m.score ?? 0), 0) / own.length)
        : null
      const last = own.map((m) => m.logged_at).sort().at(-1) ?? null
      statsByPatient.set(p.id, { mealsCount: own.length, avgScore: avg, lastLoggedAt: last })
    }
  }

  const patients: Patient[] = profileRows.map((p) => {
    const stats = statsByPatient.get(p.id) ?? { mealsCount: 0, avgScore: null, lastLoggedAt: null }
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      mealsCount7d: stats.mealsCount,
      avgScore7d: stats.avgScore,
      lastLoggedAt: stats.lastLoggedAt,
      column: classifyPatient({
        mealsCount7d: stats.mealsCount,
        avgScore7d: stats.avgScore,
        lastLoggedAt: stats.lastLoggedAt,
      }),
    }
  })

  // Active invites = pending and not expired. Accepted/expired hidden from
  // the kanban (the relationship now lives under patients), but recent ones
  // still show up in the secondary "histórico" list.
  const now = Date.now()
  const pendingInvites: Invite[] = allInvites
    .filter((inv) => inv.status === "pending" && new Date(inv.expires_at).getTime() > now)
    .map((inv) => ({
      id: inv.id,
      patient_email: inv.patient_email,
      created_at: inv.created_at ?? "",
      expires_at: inv.expires_at,
      token: inv.token ?? "",
    }))

  const historyInvites: Invite[] = allInvites
    .filter((inv) => inv.status !== "pending" || new Date(inv.expires_at).getTime() <= now)
    .map((inv) => ({
      id: inv.id,
      patient_email: inv.patient_email,
      created_at: inv.created_at ?? "",
      expires_at: inv.expires_at,
      token: inv.token ?? "",
      status: inv.status,
    }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl italic text-[#1a3a2a]">Pacientes</h1>
        <p className="text-sm text-[#1a3a2a]/60 mt-1">
          Visão geral dos seus pacientes por nível de engajamento.
        </p>
      </div>
      <PacientesClient
        patients={patients}
        pendingInvites={pendingInvites}
        historyInvites={historyInvites}
      />
    </div>
  )
}
