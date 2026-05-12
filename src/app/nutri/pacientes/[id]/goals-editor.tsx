"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Target, Loader2, Check } from "lucide-react"
import { toast } from "sonner"

type Goals = {
  calories_target: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  notes: string | null
  updated_at: string | null
}

type FieldKey = "calories_target" | "protein_g" | "carbs_g" | "fat_g"

const FIELDS: { key: FieldKey; label: string; unit: string; max: number }[] = [
  { key: "calories_target", label: "Calorias", unit: "kcal", max: 19999 },
  { key: "protein_g", label: "Proteína", unit: "g", max: 1999 },
  { key: "carbs_g", label: "Carboidratos", unit: "g", max: 1999 },
  { key: "fat_g", label: "Gordura", unit: "g", max: 1999 },
]

function toInputValue(n: number | null): string {
  return n == null ? "" : String(n)
}

function parseField(raw: string, max: number): number | null | "invalid" {
  const trimmed = raw.trim()
  if (trimmed === "") return null
  if (!/^\d+$/.test(trimmed)) return "invalid"
  const n = Number(trimmed)
  if (n < 0 || n > max) return "invalid"
  return n
}

export function GoalsEditor({
  patientId,
  initial,
}: {
  patientId: string
  initial: Goals | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [values, setValues] = useState({
    calories_target: toInputValue(initial?.calories_target ?? null),
    protein_g: toInputValue(initial?.protein_g ?? null),
    carbs_g: toInputValue(initial?.carbs_g ?? null),
    fat_g: toInputValue(initial?.fat_g ?? null),
    notes: initial?.notes ?? "",
  })

  const dirty =
    values.calories_target !== toInputValue(initial?.calories_target ?? null) ||
    values.protein_g !== toInputValue(initial?.protein_g ?? null) ||
    values.carbs_g !== toInputValue(initial?.carbs_g ?? null) ||
    values.fat_g !== toInputValue(initial?.fat_g ?? null) ||
    (values.notes ?? "") !== (initial?.notes ?? "")

  const save = async () => {
    const payload: Record<string, unknown> = { patient_id: patientId }
    for (const f of FIELDS) {
      const parsed = parseField(values[f.key], f.max)
      if (parsed === "invalid") {
        toast.error(`${f.label}: valor inválido (0–${f.max}).`)
        return
      }
      payload[f.key] = parsed
    }
    payload.notes = values.notes.trim() === "" ? null : values.notes.trim().slice(0, 4000)

    setSaving(true)
    try {
      const res = await fetch("/api/nutri/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string; goals?: unknown }
      if (!res.ok) {
        toast.error(body.error || "Falha ao salvar.")
        return
      }
      toast.success("Metas salvas.")
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
      startTransition(() => router.refresh())
    } catch {
      toast.error("Erro de rede.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-0 shadow-md p-5">
      <h2 className="text-sm font-semibold text-[#1a3a2a] mb-1 flex items-center gap-2">
        <Target className="w-4 h-4" />
        Metas de macros
      </h2>
      <p className="text-xs text-[#1a3a2a]/55 mb-4">
        O paciente vê estas metas no painel dele(a). Atualizações aparecem em tempo real.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <Label htmlFor={`goal-${f.key}`} className="text-xs text-[#1a3a2a]/70">
              {f.label} <span className="text-[#1a3a2a]/40">({f.unit})</span>
            </Label>
            <Input
              id={`goal-${f.key}`}
              inputMode="numeric"
              placeholder="—"
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value.replace(/[^\d]/g, "") }))}
              className="mt-1"
            />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Label htmlFor="goal-notes" className="text-xs text-[#1a3a2a]/70">
          Observações <span className="text-[#1a3a2a]/40">(opcional)</span>
        </Label>
        <textarea
          id="goal-notes"
          rows={3}
          maxLength={4000}
          value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          placeholder="Ex.: priorizar proteína no café da manhã."
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] text-[#1a3a2a]/40">
          {initial?.updated_at
            ? `Atualizado em ${new Date(initial.updated_at).toLocaleString("pt-BR")}`
            : "Nenhuma meta definida ainda."}
        </span>
        <Button
          onClick={save}
          disabled={saving || pending || !dirty}
          className="bg-[#1a3a2a] hover:bg-[#1a3a2a]/90 text-white"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : savedFlash ? (
            <><Check className="w-4 h-4 mr-2" />Salvo</>
          ) : (
            "Salvar metas"
          )}
        </Button>
      </div>
    </Card>
  )
}
