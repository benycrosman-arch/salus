import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { PacientesClient } from "./pacientes-client"

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
  if (!user) return null

  const { data: links } = await supabase
    .from("nutri_patient_links")
    .select("patient_id, status, created_at")
    .eq("nutri_id", user.id)
    .eq("status", "active")

  let patients: { id: string; name: string | null; email: string | null }[] = []
  if (links && links.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", links.map((l) => l.patient_id))
    patients = data ?? []
  }

  const { data: invites } = await supabase
    .from("nutri_invites")
    .select("id, patient_email, status, created_at, expires_at, token")
    .eq("nutri_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl italic text-[#1a3a2a]">Pacientes</h1>
        <p className="text-sm text-[#1a3a2a]/60 mt-1">
          Convide novos pacientes e acompanhe seus dados.
        </p>
      </div>
      <PacientesClient patients={patients} invites={invites ?? []} />
    </div>
  )
}
