"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, Sparkles, Plus, Trash2, Utensils, Check, X, Wand2 } from "@/components/icons"
import { toast } from "sonner"

const MEAL_TYPES = ["breakfast", "snack1", "lunch", "snack2", "dinner"] as const
type MealType = (typeof MEAL_TYPES)[number]

const LABEL: Record<MealType, string> = {
  breakfast: "Café da manhã",
  snack1: "Lanche da manhã",
  lunch: "Almoço",
  snack2: "Lanche da tarde",
  dinner: "Jantar",
}

interface Macros {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

interface Option {
  id: string
  meal_type: MealType
  title: string
  description: string | null
  macros: Macros
  source: "manual" | "ai" | "patient_swap"
  parent_option_id: string | null
  is_active: boolean
  created_at: string
}

interface Draft {
  meal_type: MealType
  title: string
  description: string
  macros: Macros
  rationale: string
  selected: boolean
}

interface Props {
  patientId: string
  initialOptions: Option[]
}

const EMPTY_MACROS: Macros = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }

function macroLine(m: Macros) {
  return `${m.calories} kcal · P ${m.protein_g}g · C ${m.carbs_g}g · G ${m.fat_g}g · Fibra ${m.fiber_g}g`
}

export function MealsEditor({ patientId, initialOptions }: Props) {
  // Nutri only manages the options she authored (manual/ai); patient swaps are
  // shown for context but not editable here.
  const [options, setOptions] = useState<Option[]>(
    initialOptions.filter((o) => o.source !== "patient_swap"),
  )
  const [genTypes, setGenTypes] = useState<Set<MealType>>(new Set(MEAL_TYPES))
  const [generating, setGenerating] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [savingDrafts, setSavingDrafts] = useState(false)
  const [showManual, setShowManual] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<MealType, Option[]>()
    for (const t of MEAL_TYPES) map.set(t, [])
    for (const o of options) map.get(o.meal_type)?.push(o)
    return map
  }, [options])

  function toggleGenType(t: MealType) {
    setGenTypes((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  async function handleGenerate() {
    if (generating) return
    if (genTypes.size === 0) {
      toast.error("Selecione ao menos um tipo de refeição.")
      return
    }
    setGenerating(true)
    setDrafts([])
    try {
      const res = await fetch("/api/nutri/meals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, mealTypes: Array.from(genTypes) }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof payload?.error === "string" ? payload.error : "Erro ao gerar.")
        return
      }
      const generated = (payload.options ?? []) as Omit<Draft, "selected">[]
      if (generated.length === 0) {
        toast.error("A IA não retornou opções. Tente novamente.")
        return
      }
      setDrafts(generated.map((d) => ({ ...d, selected: true })))
      toast.success(`${generated.length} opções geradas. Revise e adicione.`)
    } catch {
      toast.error("Erro de rede.")
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveDrafts() {
    const chosen = drafts.filter((d) => d.selected)
    if (chosen.length === 0) {
      toast.error("Selecione ao menos uma opção.")
      return
    }
    setSavingDrafts(true)
    try {
      const res = await fetch("/api/nutri/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          options: chosen.map((d) => ({
            meal_type: d.meal_type,
            title: d.title,
            description: d.description,
            macros: d.macros,
            source: "ai",
          })),
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof payload?.error === "string" ? payload.error : "Erro ao salvar.")
        return
      }
      const saved = (payload.options ?? []) as Option[]
      setOptions((prev) => [...prev, ...saved])
      setDrafts([])
      toast.success(`${saved.length} refeições adicionadas ao paciente.`)
    } catch {
      toast.error("Erro de rede.")
    } finally {
      setSavingDrafts(false)
    }
  }

  async function handleDelete(id: string) {
    const prev = options
    setOptions((o) => o.filter((x) => x.id !== id))
    try {
      const res = await fetch(`/api/nutri/meals?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      if (!res.ok) {
        setOptions(prev)
        toast.error("Erro ao remover.")
      }
    } catch {
      setOptions(prev)
      toast.error("Erro de rede.")
    }
  }

  function handleManualSaved(saved: Option) {
    setOptions((prev) => [...prev, saved])
    setShowManual(false)
  }

  const total = options.length

  return (
    <Card className="border-0 shadow-md p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#1a3a2a] flex items-center gap-2">
          <Utensils className="w-4 h-4" />
          Refeições do paciente
          {total > 0 && (
            <span className="text-[11px] font-normal text-[#1a3a2a]/40">({total} opções)</span>
          )}
        </h2>
      </div>

      <p className="text-xs text-[#1a3a2a]/60 font-body mb-4 leading-relaxed">
        Monte um banco de opções por tipo de refeição. A IA usa os exames, metas, sua orientação
        ativa e o material enviado para sugerir refeições que ajudam o paciente a bater as metas. O
        paciente pode trocar uma opção por uma alternativa parecida, sempre dentro do seu plano.
      </p>

      {/* AI generation panel */}
      <div className="rounded-xl border border-[#1a3a2a]/10 bg-[#1a3a2a]/[0.03] p-4 mb-4">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-[#1a3a2a]" />
          <span className="text-xs font-semibold text-[#1a3a2a]">Gerar com IA</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {MEAL_TYPES.map((t) => {
            const on = genTypes.has(t)
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleGenType(t)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-body transition-colors ${
                  on
                    ? "bg-[#1a3a2a] text-white"
                    : "bg-white text-[#1a3a2a]/60 border border-[#e4ddd4]"
                }`}
              >
                {LABEL[t]}
              </button>
            )
          })}
        </div>
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          aria-busy={generating}
          size="sm"
          className="rounded-xl gap-1.5"
        >
          {generating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wand2 className="w-3.5 h-3.5" />
          )}
          {generating ? "Gerando..." : "Gerar opções"}
        </Button>
      </div>

      {/* Draft review */}
      {drafts.length > 0 && (
        <div className="rounded-xl border border-[#1a3a2a]/15 bg-white p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#1a3a2a]">
              Rascunhos da IA ({drafts.filter((d) => d.selected).length}/{drafts.length} selecionados)
            </span>
            <button
              type="button"
              onClick={() => setDrafts([])}
              className="text-[11px] text-[#1a3a2a]/50 hover:text-[#1a3a2a] inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Descartar
            </button>
          </div>
          <ul className="space-y-2 mb-3">
            {drafts.map((d, i) => (
              <li
                key={i}
                className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                  d.selected ? "border-[#1a3a2a]/40 bg-[#1a3a2a]/[0.03]" : "border-[#e4ddd4] opacity-60"
                }`}
                onClick={() =>
                  setDrafts((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, selected: !x.selected } : x)),
                  )
                }
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                      d.selected ? "bg-[#1a3a2a] text-white" : "border border-[#1a3a2a]/30"
                    }`}
                  >
                    {d.selected && <Check className="w-3 h-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider text-[#1a3a2a]/40">
                        {LABEL[d.meal_type]}
                      </span>
                      <span className="text-sm font-medium text-[#1a3a2a]">{d.title}</span>
                    </div>
                    {d.description && (
                      <p className="text-xs text-[#1a3a2a]/70 font-body mt-1 leading-relaxed">
                        {d.description}
                      </p>
                    )}
                    <p className="text-[11px] text-[#1a3a2a]/50 font-body mt-1.5">{macroLine(d.macros)}</p>
                    {d.rationale && (
                      <p className="text-[11px] text-[#4a7c4a] font-body mt-1 italic">{d.rationale}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            onClick={handleSaveDrafts}
            disabled={savingDrafts}
            aria-busy={savingDrafts}
            size="sm"
            className="rounded-xl gap-1.5 w-full"
          >
            {savingDrafts ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Adicionar selecionadas ao paciente
          </Button>
        </div>
      )}

      {/* Existing options grouped by meal type */}
      <div className="space-y-4">
        {MEAL_TYPES.map((t) => {
          const list = grouped.get(t) ?? []
          if (list.length === 0) return null
          return (
            <div key={t}>
              <h3 className="text-[11px] uppercase tracking-wider text-[#1a3a2a]/40 mb-1.5">
                {LABEL[t]}
              </h3>
              <ul className="space-y-1.5">
                {list.map((o) => (
                  <li
                    key={o.id}
                    className="rounded-lg border border-[#e4ddd4] p-3 flex items-start gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#1a3a2a]">{o.title}</span>
                        {o.source === "ai" && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-[#1a3a2a]/40">
                            <Sparkles className="w-2.5 h-2.5" />
                            IA
                          </span>
                        )}
                      </div>
                      {o.description && (
                        <p className="text-xs text-[#1a3a2a]/70 font-body mt-1 leading-relaxed">
                          {o.description}
                        </p>
                      )}
                      <p className="text-[11px] text-[#1a3a2a]/50 font-body mt-1.5">
                        {macroLine(o.macros)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(o.id)}
                      className="text-[#1a3a2a]/30 hover:text-[#c4614a] flex-shrink-0 p-1"
                      aria-label="Remover refeição"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {total === 0 && drafts.length === 0 && (
          <p className="text-sm text-[#1a3a2a]/50 py-4 text-center font-body">
            Nenhuma refeição ainda. Gere com IA ou adicione manualmente.
          </p>
        )}
      </div>

      {/* Manual add */}
      <div className="mt-4 pt-4 border-t border-[#e4ddd4]">
        {showManual ? (
          <ManualForm
            patientId={patientId}
            onSaved={handleManualSaved}
            onCancel={() => setShowManual(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="inline-flex items-center gap-1.5 text-xs text-[#1a3a2a]/60 hover:text-[#1a3a2a]"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar refeição manualmente
          </button>
        )}
      </div>
    </Card>
  )
}

function ManualForm({
  patientId,
  onSaved,
  onCancel,
}: {
  patientId: string
  onSaved: (o: Option) => void
  onCancel: () => void
}) {
  const [mealType, setMealType] = useState<MealType>("breakfast")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [macros, setMacros] = useState<Macros>({ ...EMPTY_MACROS })
  const [saving, setSaving] = useState(false)

  const canSave = title.trim().length >= 2 && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const res = await fetch("/api/nutri/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          option: { meal_type: mealType, title: title.trim(), description: description.trim(), macros, source: "manual" },
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof payload?.error === "string" ? payload.error : "Erro ao salvar.")
        return
      }
      const saved = (payload.options?.[0] ?? null) as Option | null
      if (saved) {
        onSaved(saved)
        toast.success("Refeição adicionada.")
      }
    } catch {
      toast.error("Erro de rede.")
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[#e4ddd4] bg-white px-3 py-2 text-sm text-[#1a3a2a] placeholder:text-[#1a3a2a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/20 font-body"

  return (
    <div className="space-y-2.5">
      <select
        value={mealType}
        onChange={(e) => setMealType(e.target.value as MealType)}
        className={inputCls}
      >
        {MEAL_TYPES.map((t) => (
          <option key={t} value={t}>
            {LABEL[t]}
          </option>
        ))}
      </select>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título (ex.: Omelete de claras com espinafre)"
        maxLength={200}
        className={inputCls}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Ingredientes, porções e preparo"
        rows={3}
        maxLength={2000}
        className={inputCls}
      />
      <div className="grid grid-cols-5 gap-1.5">
        {(["calories", "protein_g", "carbs_g", "fat_g", "fiber_g"] as const).map((k) => (
          <div key={k}>
            <label className="text-[10px] text-[#1a3a2a]/40 block mb-0.5">
              {k === "calories" ? "kcal" : k === "protein_g" ? "Prot" : k === "carbs_g" ? "Carb" : k === "fat_g" ? "Gord" : "Fibra"}
            </label>
            <input
              type="number"
              min={0}
              value={macros[k] || ""}
              onChange={(e) => setMacros((m) => ({ ...m, [k]: Math.max(0, Number(e.target.value) || 0) }))}
              className={`${inputCls} px-2`}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button type="button" onClick={handleSave} disabled={!canSave} size="sm" className="rounded-xl gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Adicionar
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-[#1a3a2a]/50 hover:text-[#1a3a2a]"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
