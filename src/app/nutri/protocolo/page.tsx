import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { ProtocoloEditor } from "./protocolo-editor"

export default async function ProtocoloPage() {
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
  if (!user) redirect("/auth/login?redirectTo=/nutri/protocolo")

  const { data: profile } = await supabase
    .from("profiles")
    .select("nutri_protocol")
    .eq("id", user.id)
    .maybeSingle()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-3xl italic text-[#1a3a2a]">Seu protocolo</h1>
        <p className="text-sm text-[#1a3a2a]/60 mt-1">
          Esse texto guia a IA quando ela responde aos seus pacientes em seu nome.
          Atualize sempre que mudar sua abordagem clínica.
        </p>
      </div>
      <ProtocoloEditor initial={profile?.nutri_protocol ?? ""} />
    </div>
  )
}
