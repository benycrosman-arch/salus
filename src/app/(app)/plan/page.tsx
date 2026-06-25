import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { PlanClient, type PlanOption } from "./plan-client"

export const dynamic = "force-dynamic"

export default async function PlanPage() {
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

  // RLS returns the paciente's own rows: the nutri's options plus their swaps.
  const { data } = await supabase
    .from("nutri_meal_options")
    .select("id, meal_type, title, description, macros, source, parent_option_id")
    .eq("patient_id", user.id)
    .eq("is_active", true)
    .order("meal_type", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(100)

  return <PlanClient initialOptions={(data ?? []) as PlanOption[]} />
}
