"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, MessageCircle, Loader2, Crown, Phone, ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

type Step = "loading" | "disabled_globally" | "needs_pro" | "enter_phone" | "enter_code" | "connected"

interface ConnectionState {
  phone_e164: string | null
  status: "pending" | "verified" | "disabled" | null
  timezone: string | null
  nudge_lunch_enabled: boolean
  nudge_dinner_enabled: boolean
  nudge_recap_enabled: boolean
}

interface StatusResponse {
  enabled: boolean
  reason?: string
  isPro?: boolean
  proSource?: string
  connection?: ConnectionState | null
}

export default function WhatsAppSettingsPage() {
  const [step, setStep] = useState<Step>("loading")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [conn, setConn] = useState<ConnectionState | null>(null)
  const [busy, setBusy] = useState(false)
  const [debugCode, setDebugCode] = useState<string | null>(null)

  async function refresh() {
    setStep("loading")
    try {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" })
      const json = (await res.json()) as StatusResponse
      if (!json.enabled) {
        setStep("disabled_globally")
        return
      }
      if (!json.isPro) {
        setStep("needs_pro")
        return
      }
      const c = json.connection ?? null
      setConn(c)
      if (!c || c.status === "disabled" || !c.phone_e164) {
        setStep("enter_phone")
      } else if (c.status === "pending") {
        setStep("enter_code")
        setPhone(c.phone_e164 ?? "")
      } else {
        setStep("connected")
      }
    } catch (err) {
      console.error(err)
      toast.error("Não consegui carregar o status do WhatsApp.")
      setStep("enter_phone")
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleStart() {
    if (!phone.trim()) return
    setBusy(true)
    setDebugCode(null)
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo"
      const res = await fetch("/api/whatsapp/start-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, timezone: tz }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(prettyError(json.error))
        return
      }
      if (json.debugCode) setDebugCode(json.debugCode as string)
      setStep("enter_code")
      toast.success("Código enviado pelo WhatsApp.")
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirm() {
    if (!code.trim()) return
    setBusy(true)
    try {
      const res = await fetch("/api/whatsapp/confirm-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(prettyError(json.error))
        return
      }
      toast.success("WhatsApp conectado.")
      setCode("")
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    setBusy(true)
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST" })
      if (!res.ok) {
        const json = await res.json()
        toast.error(prettyError(json.error))
        return
      }
      toast.success("WhatsApp desconectado.")
      setPhone("")
      setCode("")
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function togglePref(field: "nudge_lunch_enabled" | "nudge_dinner_enabled" | "nudge_recap_enabled", value: boolean) {
    setConn((prev) => (prev ? { ...prev, [field]: value } : prev))
    const res = await fetch("/api/whatsapp/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    if (!res.ok) {
      toast.error("Não consegui salvar a preferência.")
      await refresh()
    }
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sans">WhatsApp</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Receba lembretes proativos e converse com o coach do Salus pelo WhatsApp.
          </p>
        </div>
      </div>

      {step === "loading" && (
        <Card className="border-0 shadow-md p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </Card>
      )}

      {step === "disabled_globally" && (
        <Card className="border-0 shadow-md p-5">
          <p className="text-sm font-body text-muted-foreground">
            Esta funcionalidade ainda não está liberada na sua conta. Volte em breve.
          </p>
        </Card>
      )}

      {step === "needs_pro" && (
        <Card className="border-0 shadow-md p-5">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-accent" />
            <h2 className="font-semibold text-foreground">Recurso Pro</h2>
          </div>
          <p className="text-sm font-body text-muted-foreground">
            O coach por WhatsApp está incluído no plano Pro. Faça upgrade nas Configurações.
          </p>
        </Card>
      )}

      {step === "enter_phone" && (
        <Card className="border-0 shadow-md p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Conectar WhatsApp</h2>
          </div>
          <p className="text-xs font-body text-muted-foreground">
            Vamos enviar um código de 6 dígitos para o número que você informar. Use o número que tem WhatsApp ativo.
          </p>
          <div>
            <Label className="text-sm font-body">Número (com DDD)</Label>
            <Input
              type="tel"
              inputMode="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
              disabled={busy}
            />
          </div>
          <Button onClick={handleStart} disabled={busy || !phone.trim()} className="w-full">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar código"}
          </Button>
        </Card>
      )}

      {step === "enter_code" && (
        <Card className="border-0 shadow-md p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Confirmar código</h2>
          </div>
          <p className="text-xs font-body text-muted-foreground">
            Enviamos um código de 6 dígitos para o seu WhatsApp. Cole abaixo. Expira em 10 minutos.
          </p>
          {debugCode && (
            <p className="text-xs font-mono bg-muted rounded px-2 py-1">
              [dev] código: {debugCode}
            </p>
          )}
          <div>
            <Label className="text-sm font-body">Código</Label>
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="mt-1 tracking-[0.4em] text-center text-lg"
              disabled={busy}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("enter_phone")} disabled={busy} className="flex-1">
              Trocar número
            </Button>
            <Button onClick={handleConfirm} disabled={busy || code.length !== 6} className="flex-1">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
            </Button>
          </div>
        </Card>
      )}

      {step === "connected" && conn && (
        <>
          <Card className="border-0 shadow-md p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Conectado</h2>
              </div>
              <Badge className="bg-primary/10 text-primary border-0 text-xs">Ativo</Badge>
            </div>
            <p className="text-sm font-body text-foreground">{conn.phone_e164}</p>
            <p className="text-xs font-body text-muted-foreground mt-1">Fuso: {conn.timezone}</p>
          </Card>

          <Card className="border-0 shadow-md p-5">
            <h2 className="font-semibold text-foreground mb-4">Lembretes proativos</h2>
            <div className="space-y-4">
              <PreferenceRow
                title="Almoço"
                hint="Lembrete às 11h30 com foco em proteína e hidratação."
                checked={conn.nudge_lunch_enabled}
                onChange={(v) => togglePref("nudge_lunch_enabled", v)}
              />
              <Separator />
              <PreferenceRow
                title="Jantar"
                hint="Lembrete às 18h30 para fechar metas de fibra e proteína."
                checked={conn.nudge_dinner_enabled}
                onChange={(v) => togglePref("nudge_dinner_enabled", v)}
              />
              <Separator />
              <PreferenceRow
                title="Recap diário"
                hint="Resumo do dia às 21h: score, streak e o que faltou."
                checked={conn.nudge_recap_enabled}
                onChange={(v) => togglePref("nudge_recap_enabled", v)}
              />
            </div>
          </Card>

          <Button onClick={handleDisconnect} disabled={busy} variant="outline" className="w-full">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Desconectar WhatsApp"}
          </Button>
          <p className="text-xs text-center text-muted-foreground font-body">
            Você pode desconectar a qualquer momento ou enviar STOP no WhatsApp.
          </p>
        </>
      )}
    </div>
  )
}

function PreferenceRow({ title, hint, checked, onChange }: { title: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="font-body text-sm font-medium">{title}</Label>
        <p className="text-xs text-muted-foreground font-body">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function prettyError(code: unknown): string {
  switch (code) {
    case "feature_disabled":
      return "Funcionalidade ainda não habilitada na sua conta."
    case "pro_required":
      return "Disponível no plano Pro."
    case "phone_invalid":
      return "Número de telefone inválido. Use o formato (DDD) 9XXXX-XXXX."
    case "phone_required":
      return "Informe seu número de telefone."
    case "code_invalid":
      return "Código inválido."
    case "code_mismatch":
      return "Código incorreto."
    case "code_expired":
      return "Código expirado. Peça um novo."
    case "too_many_attempts":
      return "Muitas tentativas. Aguarde e tente de novo."
    case "no_pending_verification":
      return "Não encontramos uma verificação pendente."
    default:
      return "Algo deu errado. Tente de novo."
  }
}
