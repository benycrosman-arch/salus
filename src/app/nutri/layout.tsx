import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Link from "next/link"
import { NutriBottomNav } from "./bottom-nav"

export default async function NutriLayout({ children }: { children: React.ReactNode }) {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) redirect("/onboarding")
  if (profile.role !== "nutricionista") redirect("/dashboard")

  return (
    <>
      <div className="min-h-screen bg-[#fcf9f8] text-[#1b1c1c]">
        <div className="mx-auto max-w-[480px] pb-24">
          <header className="bg-[#fcf9f8] sticky top-0 z-30 h-24 flex items-center justify-between px-4 border-b border-[#e4ddd4]">
            <Link href="/nutri" className="flex items-center gap-2">
              <span className="font-serif text-7xl leading-none text-[#1a3a2a] font-bold">Salus NutriGen</span>
            </Link>
            <div className="flex items-center gap-3">
              <button
                aria-label="Notificações"
                className="hover:bg-[#eae7e7] p-2 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-[#1a3a2a]">notifications</span>
              </button>
              <div className="w-8 h-8 rounded-full bg-[#1a3a2a] text-white flex items-center justify-center text-xs font-bold border border-[#e4ddd4]">
                {(profile.name || user.email || "?").slice(0, 1).toUpperCase()}
              </div>
            </div>
          </header>
          <main className="px-4 pt-2 flex flex-col gap-6">{children}</main>
        </div>
        <NutriBottomNav />
      </div>
    </>
  )
}
