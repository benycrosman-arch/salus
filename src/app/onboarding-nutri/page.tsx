"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Loader2,
  Stethoscope,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  FileText,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { callEdgeFunction } from "@/lib/ai-client"

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI",
  "PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
]

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

export default function NutriOnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [crn, setCrn] = useState("")
  const [crnState, setCrnState] = useState("")
  const [specialty, setSpecialty] = useState<Specialty | "">("")
  const [bio, setBio] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "verifying">("idle")
  const [submitting, setSubmitting] = useState(false)

  // Pre-fill name from auth user metadata.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) return
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>
      const initial = (typeof meta.name === "string" && meta.name) || user.email?.split("@")[0] || ""
      setName(initial)
    })()
    return () => { cancelled = true }
  }, [supabase])

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Arquivo muito grande — máximo 8 MB.")
      return
    }
    const ok = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if (!ok.includes(f.type)) {
      toast.error("Envie uma imagem (JPG/PNG/WebP) ou PDF.")
      return
    }
    setFile(f)
  }

  const canSubmit =
    name.trim().length >= 3 &&
    /^\d{3,6}$/.test(crn.replace(/\D+/g, "")) &&
    crnState.length === 2 &&
    specialty !== "" &&
    !!file &&
    !submitting

  const handleSubmit = async () => {
    if (!canSubmit || !file) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Sua sessão expirou. Faça login novamente.")
        router.push("/auth/login")
        return
      }

      // Salva os dados profissionais antes do upload — assim, mesmo que o
      // usuário feche a aba durante a verificação, o painel mostra o status.
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          role: "nutricionista",
          nutri_crn: crn.replace(/\D+/g, ""),
          nutri_crn_state: crnState,
          nutri_protocol: bio.trim() || null,
          nutri_verification_status: "pending",
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
      if (profileErr) throw profileErr

      // Persist specialty alongside the nutri's preferences for later filtering.
      await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          goals: [`nutri:specialty:${specialty}`],
        }, { onConflict: "user_id" })

      // Upload do certificado para o bucket privado.
      setUploadProgress("uploading")
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin"
      const path = `${user.id}/credential-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from("nutri-credentials")
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadErr) throw uploadErr

      // Dispara a verificação por IA.
      setUploadProgress("verifying")
      const result = await callEdgeFunction<{ ok: true; status: string; reason: string }>(
        "verify-nutri-credential",
        {
          credential_path: path,
          crn: crn.replace(/\D+/g, ""),
          crn_state: crnState,
          claimed_name: name.trim(),
        },
      )

      if (result.status === "verified") {
        toast.success("Credencial verificada! Bem-vindo ao painel.")
        router.push("/nutri")
      } else if (result.status === "rejected") {
        toast.error(result.reason)
        setUploadProgress("idle")
        setSubmitting(false)
        return
      } else {
        // pending / manual_review
        router.push("/nutri/aguardando-verificacao")
      }
      router.refresh()
    } catch (err: unknown) {
      console.error("nutri onboarding failed:", err)
      const message = err instanceof Error ? err.message : "Não foi possível concluir o cadastro."
      toast.error(message)
      setUploadProgress("idle")
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
            Verificação de credencial profissional
          </h1>
          <p className="text-sm text-[#1a3a2a]/60 max-w-md mx-auto leading-relaxed">
            Para liberar o painel do nutricionista, precisamos confirmar seu registro no CRN.
            Nosso sistema verifica seu certificado contra os dados públicos do Conselho Federal
            de Nutricionistas usando IA.
          </p>
        </div>

        <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-7 space-y-6">
          <Section title="Dados profissionais">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nome completo (como aparece no CRN)" htmlFor="name">
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
              <Field label="Número do CRN" htmlFor="crn">
                <Input
                  id="crn"
                  inputMode="numeric"
                  value={crn}
                  onChange={(e) => setCrn(e.target.value.replace(/\D+/g, ""))}
                  placeholder="12345"
                  className="h-11 rounded-xl border-[#e4ddd4] bg-[#faf8f4]"
                />
              </Field>
              <Field label="Estado da regional" htmlFor="crnState">
                <select
                  id="crnState"
                  value={crnState}
                  onChange={(e) => setCrnState(e.target.value)}
                  className="h-11 rounded-xl border border-[#e4ddd4] bg-[#faf8f4] px-3 text-sm w-full text-[#1a3a2a]"
                >
                  <option value="">Selecione…</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
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

          <Section title="Certificado de registro profissional">
            <p className="text-xs text-[#1a3a2a]/60 leading-relaxed">
              Envie uma foto nítida ou PDF da sua cédula de identidade profissional emitida
              pelo CRN. Aceitamos JPG, PNG, WebP e PDF até 8 MB. O arquivo é privado — apenas
              você e o sistema de verificação têm acesso.
            </p>
            {file ? (
              <div className="flex items-center gap-3 rounded-2xl border border-[#1a3a2a]/15 bg-[#faf8f4] px-4 py-3">
                <FileText className="w-5 h-5 text-[#1a3a2a]/60 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a3a2a] truncate">{file.name}</p>
                  <p className="text-xs text-[#1a3a2a]/50">
                    {(file.size / 1024 / 1024).toFixed(1)} MB · {file.type.split("/")[1]?.toUpperCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  disabled={submitting}
                  className="text-[#1a3a2a]/40 hover:text-[#c4614a] disabled:opacity-30"
                  aria-label="Remover arquivo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="credential-upload"
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#1a3a2a]/20 bg-[#faf8f4] px-6 py-10 cursor-pointer hover:border-[#1a3a2a]/40 transition-colors"
              >
                <Upload className="w-6 h-6 text-[#1a3a2a]/50" />
                <p className="text-sm font-medium text-[#1a3a2a]">Clique para enviar</p>
                <p className="text-xs text-[#1a3a2a]/50">Foto ou PDF do certificado CRN</p>
                <input
                  id="credential-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={onPickFile}
                  className="hidden"
                />
              </label>
            )}
          </Section>

          <div className="rounded-2xl bg-[#1a3a2a]/[0.04] p-4 flex gap-3 items-start">
            <ShieldCheck className="w-4 h-4 text-[#1a3a2a]/70 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#1a3a2a]/70 leading-relaxed">
              <strong>Como funciona a verificação:</strong> Claude Opus 4.7 (visão) extrai os dados do
              seu certificado e cruza com a consulta pública do CFN. Se tudo bate com seu cadastro,
              seu painel é liberado em segundos. Se houver dúvidas, nossa equipe revisa em até 24h.
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-12 rounded-full bg-[#1a3a2a] text-white font-semibold hover:bg-[#1a3a2a]/90 disabled:opacity-40"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadProgress === "uploading" && "Enviando certificado…"}
                {uploadProgress === "verifying" && "Verificando com IA…"}
                {uploadProgress === "idle" && "Processando…"}
              </span>
            ) : (
              "Enviar para verificação"
            )}
          </Button>

          <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] text-[#1a3a2a]/55">
            <Stat icon={CheckCircle2} label="LGPD compliant" />
            <Stat icon={ShieldCheck} label="Arquivo privado" />
            <Stat icon={AlertTriangle} label="Auditoria humana" />
          </div>
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

function Stat({ icon: Icon, label }: { icon: typeof CheckCircle2; label: string }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  )
}
