import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { OnboardingNutriForm } from "./onboarding-nutri-form"

export const dynamic = "force-dynamic"

// Server-side gate. Two reasons:
// 1. Nutri que já completou onboarding nunca renderiza UI nenhuma — vai direto
//    pra /nutri por redirect 307. Bundle stale no browser de quem já passou
//    daqui não tem chance de mostrar form antigo.
// 2. O form em si vive em ./onboarding-nutri-form (caminho novo), então o
//    chunk JS tem hash diferente e cache do browser não bate.
export default async function NutriOnboardingPage() {
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
  if (!user) redirect("/auth/login?redirectTo=/onboarding-nutri")

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.onboarding_completed) redirect("/nutri")

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const initialName =
    (profile?.name && profile.name.trim()) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    ""

  return <OnboardingNutriForm initialName={initialName} />
}
