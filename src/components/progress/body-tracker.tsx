"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts"
import { Plus, Loader2, Scale, Activity, TrendingDown, TrendingUp } from "lucide-react"
import { toast } from "sonner"

type BodyLog = {
  id: string
  measured_at: string
  weight_kg: number | null
  body_fat_pct: number | null
  muscle_mass_kg: number | null
  water_pct: number | null
  visceral_fat: number | null
  source: string
}

export function BodyTracker() {
  const [logs, setLogs] = useState<BodyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    measured_at: new Date().toISOString().slice(0, 10),
    weight_kg: "",
    body_fat_pct: "",
    muscle_mass_kg: "",
    water_pct: "",
    visceral_fat: "",
  })

  useEffect(() => {
    fetch("/api/body/log?days=90")
      .then((r) => r.json())
      .then((data) => setLogs(data.logs ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/body/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error || "Falha ao salvar")
        return
      }
      toast.success("Registro salvo!")
      setLogs((prev) => [...prev, body.log].sort((a, b) => a.measured_at.localeCompare(b.measured_at)))
      setForm({ ...form, weight_kg: "", body_fat_pct: "", muscle_mass_kg: "", water_pct: "", visceral_fat: "" })
      setOpen(false)
    } catch {
      toast.error("Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  const weightLogs = logs.filter((l) => l.weight_kg != null)
  const latest = weightLogs[weightLogs.length - 1]
  const first = weightLogs[0]

  const trend =
    latest && first && latest !== first
      ? Number((latest.weight_kg! - first.weight_kg!).toFixed(1))
      : 0

  const chartData = weightLogs.map((l) => ({
    date: l.measured_at,
    label: new Date(l.measured_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    weight: l.weight_kg,
    bodyFat: l.body_fat_pct,
  }))

  const latestBodyFat = [...logs].reverse().find((l) => l.body_fat_pct != null)?.body_fat_pct
  const latestMuscle = [...logs].reverse().find((l) => l.muscle_mass_kg != null)?.muscle_mass_kg

  if (loading) {
    return (
      <Card className="border-0 shadow-md p-5 flex items-center justify-center min-h-[120px]">
        <Loader2 className="w-5 h-5 animate-spin text-[#1a3a2a]/40" />
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-md p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Composição corporal</h2>
          <p className="text-xs text-muted-foreground font-body">Últimos 90 dias</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gap-1.5 bg-[#1a3a2a] hover:bg-[#1a3a2a]/90">
              <Plus className="w-3.5 h-3.5" />
              Registrar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo registro corporal</DialogTitle>
              <DialogDescription>Preencha o que tiver — qualquer campo já basta.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  value={form.measured_at}
                  onChange={(e) => setForm({ ...form, measured_at: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Peso (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="72.5"
                    value={form.weight_kg}
                    onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Gordura corporal (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="22.0"
                    value={form.body_fat_pct}
                    onChange={(e) => setForm({ ...form, body_fat_pct: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Massa muscular (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="55.0"
                    value={form.muscle_mass_kg}
                    onChange={(e) => setForm({ ...form, muscle_mass_kg: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Água (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="55.0"
                    value={form.water_pct}
                    onChange={(e) => setForm({ ...form, water_pct: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          icon={Scale}
          label="Peso atual"
          value={latest?.weight_kg ? `${latest.weight_kg.toFixed(1)} kg` : "—"}
          sub={
            trend !== 0 ? (
              <span className={`inline-flex items-center gap-0.5 ${trend < 0 ? "text-green-600" : "text-orange-600"}`}>
                {trend < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {Math.abs(trend).toFixed(1)} kg
              </span>
            ) : (
              "—"
            )
          }
        />
        <KpiCard
          icon={Activity}
          label="% Gordura"
          value={latestBodyFat ? `${latestBodyFat.toFixed(1)}%` : "—"}
          sub="último registro"
        />
        <KpiCard
          icon={Activity}
          label="Músculo"
          value={latestMuscle ? `${latestMuscle.toFixed(1)} kg` : "—"}
          sub="último registro"
        />
      </div>

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e4ddd4", fontSize: 12 }}
                formatter={(v: number) => `${v} kg`}
                labelFormatter={(l) => `Data: ${l}`}
              />
              {first && <ReferenceLine y={first.weight_kg ?? undefined} stroke="#e4ddd4" strokeDasharray="2 2" />}
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#1a3a2a"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#1a3a2a" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-8 text-xs text-muted-foreground font-body">
          Registre pelo menos 2 medições pra ver o gráfico de progresso.
        </div>
      )}
    </Card>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Scale
  label: string
  value: string
  sub: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-[#faf8f4] p-3">
      <Icon className="w-3.5 h-3.5 text-[#1a3a2a]/60 mb-1.5" />
      <div className="text-xs text-muted-foreground font-body">{label}</div>
      <div className="text-base font-bold text-foreground mt-0.5">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5 font-body">{sub}</div>
    </div>
  )
}
