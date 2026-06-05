import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Link from "next/link"
import { LayoutDashboard, Users, Settings, FileText } from "lucide-react"

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
    <div className="min-h-screen bg-[#faf8f4]">
      <header className="border-b border-[#e4ddd4] bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 h-14 flex items-center justify-between">
          <Link href="/nutri" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1a3a2a] flex items-center justify-center">
              <span className="text-white font-bold text-xs">N</span>
            </div>
            <span className="font-serif italic text-lg text-[#1a3a2a]">Salus Nutri</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink href="/nutri" icon={<LayoutDashboard className="w-4 h-4" />} label="Painel" />
            <NavLink href="/nutri/pacientes" icon={<Users className="w-4 h-4" />} label="Pacientes" />
            <NavLink href="/nutri/protocolo" icon={<FileText className="w-4 h-4" />} label="Protocolo" />
            <NavLink href="/nutri/config" icon={<Settings className="w-4 h-4" />} label="Config" />
          </nav>
          <div className="text-xs text-[#1a3a2a]/60 hidden sm:block">
            {profile.name || user.email}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 sm:px-8 py-8">{children}</main>
    </div>
  )
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[#1a3a2a]/60 hover:text-[#1a3a2a] hover:bg-[#1a3a2a]/5 transition-colors"
    >
      {icon}
      {label}
    </Link>
  )
}
