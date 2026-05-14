import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Mail, Phone, IdCard } from "lucide-react"
import { SignOutButton } from "@/app/(app)/profile/sign-out-button"
import { DeleteAccountCard } from "./delete-account-card"

export const dynamic = "force-dynamic"

export default async function NutriConfigPage() {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, phone, nutri_protocol")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) redirect("/nutri")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl italic text-[#1a3a2a]">Configurações</h1>
        <p className="text-sm text-[#1a3a2a]/60 mt-1">Gerencie sua conta e seus dados.</p>
      </div>

      <Card className="border-0 shadow-md p-6">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-[#1a3a2a]/50 mb-4">
          Dados da conta
        </p>
        <div className="space-y-3">
          <Row icon={IdCard} label="Nome" value={profile.name || "—"} />
          <Row icon={Mail} label="E-mail" value={profile.email || user.email || "—"} />
          <Row icon={Phone} label="Telefone" value={profile.phone || "—"} />
        </div>
      </Card>

      <Card className="border-0 shadow-md p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-[#1a3a2a]/50">
            Seu protocolo
          </p>
          <Link href="/nutri/protocolo" className="text-xs text-[#c4614a] hover:underline">
            Editar
          </Link>
        </div>
        <p className="text-sm text-[#1a3a2a]/80 leading-relaxed font-body whitespace-pre-line">
          {profile.nutri_protocol?.slice(0, 280) || "Nenhum protocolo definido. Clique em editar para escrever instruções padrão para seus pacientes."}
          {profile.nutri_protocol && profile.nutri_protocol.length > 280 && "…"}
        </p>
      </Card>

      <Card className="border-0 shadow-md p-6 ring-1 ring-[#c4614a]/20">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-[#c4614a]/80 mb-2">
          Sessão
        </p>
        <p className="text-xs text-[#1a3a2a]/60 mb-4 font-body">
          Sair desconecta este dispositivo do painel do nutricionista.
        </p>
        <SignOutButton />
      </Card>

      <DeleteAccountCard />
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-[#1a3a2a]/40 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-[#1a3a2a]/50">{label}</p>
        <p className="text-sm text-[#1a3a2a] font-body truncate">{value}</p>
      </div>
    </div>
  )
}
