"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, Stethoscope } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const SPECIALTIES = [
  "clinica",
  "esportiva",
  "materno-infantil",
  "saude-coletiva",
  "geriatrica",
  "vegetariana-vegana",
  "oncologica",
  "esteticista",
  "outra",
] as const

type Specialty = (typeof SPECIALTIES)[number]

const SPECIALTY_LABEL: Record<Specialty, string> = {
  "clinica": "Clínica",
  "esportiva": "Esportiva",
  "materno-infantil": "Materno-infantil",
  "saude-coletiva": "Saúde coletiva",
  "geriatrica": "Geriátrica",
  "vegetariana-vegana": "Vegetariana / vegana",
  "oncologica": "Oncológica",
  "esteticista": "Estética",
  "outra": "Outra",
}

export function OnboardingNutriForm({ initialName }: { initialName: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState("")
  const [specialty, setSpecialty] = useState<Specialty | "">("")
  const [bio, setBio] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Fallback: if SSR didn't have a session yet (e.g. just after signup),
  // pull the name from the browser-side user metadata.
  useEffect(() => {
    if (initialName) return
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) return
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>
      const fallback = (typeof meta.name === "string" && meta.name) || user.email?.split("@")[0] || ""
      setName(fallback)
    })()
    return () => { cancelled = true }
  }, [initialName, supabase])

  const canSubmit = name.trim().length >= 3 && specialty !== "" && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Sua sessão expirou. Faça login novamente.")
        router.push("/auth/login")
        return
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          role: "nutricionista",
          nutri_protocol: bio.trim() || null,
          nutri_verification_status: "verified",
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
      if (profileErr) throw profileErr

      await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          goals: [`nutri:specialty:${specialty}`],
        }, { onConflict: "user_id" })

      toast.success("Cadastro concluído! Bem-vindo ao painel.")
      router.push("/nutri")
      router.refresh()
    } catch (err: unknown) {
      console.error("nutri onboarding failed:", err)
      const message = err instanceof Error ? err.message : "Não foi possível concluir o cadastro."
      toast.error(message)
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8f4] py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#c4614a]/10 flex items-center justify-center mx-auto">
            <Stethoscope className="w-6 h-6 text-[#c4614a]" />
          </div>
          <h1 className="font-serif text-3xl italic text-[#1a3a2a]">
            Bem-vindo ao painel do nutricionista
          </h1>
          <p className="text-sm text-[#1a3a2a]/60 max-w-md mx-auto leading-relaxed">
            Conte rapidamente sobre você. Depois disso, você pode começar a convidar pacientes.
          </p>
        </div>

        <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-7 space-y-6">
          <Section title="Sobre você">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nome completo" htmlFor="name">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Maria Silva"
                  className="h-11 rounded-xl border-[#e4ddd4] bg-[#faf8f4]"
                />
              </Field>
              <Field label="Telefone (opcional)" htmlFor="phone">
                <Input
                  id="phone"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="h-11 rounded-xl border-[#e4ddd4] bg-[#faf8f4]"
                />
              </Field>
            </div>
            <Field label="Especialidade principal" htmlFor="specialty">
              <select
                id="specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value as Specialty)}
                className="h-11 rounded-xl border border-[#e4ddd4] bg-[#faf8f4] px-3 text-sm w-full text-[#1a3a2a]"
              >
                <option value="">Selecione…</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{SPECIALTY_LABEL[s]}</option>
                ))}
              </select>
            </Field>
            <Field label="Bio / protocolo padrão (opcional, mostrado aos pacientes)" htmlFor="bio">
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ex.: foco em emagrecimento metabólico, atendimento online, atendo a partir de 18 anos."
                rows={3}
                className="rounded-xl border-[#e4ddd4] bg-[#faf8f4]"
                maxLength={4000}
              />
            </Field>
          </Section>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-12 rounded-full bg-[#1a3a2a] text-white font-semibold hover:bg-[#1a3a2a]/90 disabled:opacity-40"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando…
              </span>
            ) : (
              "Entrar no painel"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-[#1a3a2a]/50">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-[#1a3a2a]/80">
        {label}
      </Label>
      {children}
    </div>
  )
}
