"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  CalendarDays,
  ArrowRight,
  RefreshCw,
  Loader2,
  Sparkles,
  Undo2,
  Wand2,
  ChevronDown,
} from "@/components/icons"
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

export interface PlanOption {
  id: string
  meal_type: MealType
  title: string
  description: string | null
  macros: Macros
  source: "manual" | "ai" | "patient_swap"
  parent_option_id: string | null
}

// Shape returned by /api/plan/generate (the 7-day individualized plan).
interface PlanMeal {
  name: string
  description: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}
interface PlanDay {
  day: string
  meals: Record<MealType, PlanMeal>
}
interface WeekPlan {
  targets: { kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; rationale: string }
  days: PlanDay[]
  notes: string
}

function macroLine(m: Macros) {
  return `${m.calories} kcal · P ${m.protein_g}g · C ${m.carbs_g}g · G ${m.fat_g}g · Fibra ${m.fiber_g}g`
}

export function PlanClient({ initialOptions }: { initialOptions: PlanOption[] }) {
  const [options, setOptions] = useState<PlanOption[]>(initialOptions)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null)
  const [generatingWeek, setGeneratingWeek] = useState(false)
  const [openDay, setOpenDay] = useState<number>(0)

  // The nutri's own options (manual/ai) are the plan; patient swaps replace one.
  const { grouped, swapByParent } = useMemo(() => {
    const swapByParent = new Map<string, PlanOption>()
    for (const o of options) {
      if (o.source === "patient_swap" && o.parent_option_id) {
        swapByParent.set(o.parent_option_id, o)
      }
    }
    const grouped = new Map<MealType, PlanOption[]>()
    for (const t of MEAL_TYPES) grouped.set(t, [])
    for (const o of options) {
      if (o.source !== "patient_swap") grouped.get(o.meal_type)?.push(o)
    }
    return { grouped, swapByParent }
  }, [options])

  async function handleGenerateWeek() {
    if (generatingWeek) return
    setGeneratingWeek(true)
    try {
      const res = await fetch("/api/plan/generate", { method: "POST" })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof payload?.error === "string" ? payload.error : "Erro ao gerar o plano.")
        return
      }
      setWeekPlan({ targets: payload.targets, days: payload.days ?? [], notes: payload.notes ?? "" })
      setOpenDay(0)
      toast.success("Plano da semana gerado com IA.")
    } catch {
      toast.error("Erro de rede.")
    } finally {
      setGeneratingWeek(false)
    }
  }

  async function handleSwap(optionId: string) {
    if (busyId) return
    setBusyId(optionId)
    try {
      const res = await fetch("/api/patient/meals/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof payload?.error === "string" ? payload.error : "Erro ao trocar.")
        return
      }
      const swap = payload.option as PlanOption
      setOptions((prev) => [
        ...prev.filter((o) => !(o.source === "patient_swap" && o.parent_option_id === optionId)),
        swap,
      ])
      toast.success("Pronto! Geramos uma alternativa parecida no seu plano.")
    } catch {
      toast.error("Erro de rede.")
    } finally {
      setBusyId(null)
    }
  }

  async function handleRevert(swap: PlanOption, parentId: string) {
    if (busyId) return
    setBusyId(parentId)
    const prev = options
    setOptions((o) => o.filter((x) => x.id !== swap.id))
    try {
      const res = await fetch(`/api/patient/meals/swap?id=${encodeURIComponent(swap.id)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        setOptions(prev)
        toast.error("Erro ao reverter.")
      }
    } catch {
      setOptions(prev)
      toast.error("Erro de rede.")
    } finally {
      setBusyId(null)
    }
  }

  const hasOptions = options.some((o) => o.source !== "patient_swap")

  return (
    <div className="page-enter px-4 py-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-sans text-foreground">Plano de refeições</h1>
        <p className="text-sm text-muted-foreground font-body mt-1 leading-relaxed">
          Seu plano individualizado e as opções montadas pelo seu nutricionista. Você pode trocar uma
          refeição por uma alternativa parecida, sempre dentro das suas metas.
        </p>
      </div>

      {/* Section 1 — full 7-day individualized plan (AI) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Plano da semana
          </h2>
          <Button
            type="button"
            onClick={handleGenerateWeek}
            disabled={generatingWeek}
            size="sm"
            variant={weekPlan ? "outline" : "default"}
            className="rounded-xl gap-1.5"
          >
            {generatingWeek ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            {generatingWeek ? "Gerando..." : weekPlan ? "Gerar de novo" : "Gerar com IA"}
          </Button>
        </div>

        {!weekPlan && !generatingWeek && (
          <Card className="border-0 shadow-sm p-5 text-sm text-muted-foreground font-body leading-relaxed">
            Gere um plano completo de 7 dias com IA, individualizado a partir do seu perfil, exames,
            metas e do material do seu nutricionista.
          </Card>
        )}

        {weekPlan && (
          <div className="space-y-3">
            <Card className="border-0 shadow-sm p-4">
              <p className="text-xs font-semibold text-foreground mb-1">Metas diárias</p>
              <p className="text-[11px] text-muted-foreground font-body">
                {weekPlan.targets.kcal} kcal · P {weekPlan.targets.protein_g}g · C{" "}
                {weekPlan.targets.carbs_g}g · G {weekPlan.targets.fat_g}g · Fibra{" "}
                {weekPlan.targets.fiber_g}g
              </p>
              {weekPlan.targets.rationale && (
                <p className="text-[11px] text-muted-foreground/70 font-body mt-1.5 italic">
                  {weekPlan.targets.rationale}
                </p>
              )}
            </Card>

            <div className="space-y-2">
              {weekPlan.days.map((d, i) => {
                const open = openDay === i
                return (
                  <Card key={i} className="border-0 shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenDay(open ? -1 : i)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <span className="text-sm font-semibold text-foreground">{d.day}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open && (
                      <div className="px-4 pb-4 space-y-3">
                        {MEAL_TYPES.map((t) => {
                          const m = d.meals?.[t]
                          if (!m) return null
                          return (
                            <div key={t} className="border-t border-border pt-3">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                {LABEL[t]}
                              </p>
                              <p className="text-sm font-medium text-foreground mt-0.5">{m.name}</p>
                              {m.description && (
                                <p className="text-xs text-muted-foreground font-body mt-0.5 leading-relaxed">
                                  {m.description}
                                </p>
                              )}
                              <p className="text-[11px] text-muted-foreground/80 font-body mt-1">
                                {m.calories} kcal · P {m.protein_g}g · C {m.carbs_g}g · G {m.fat_g}g
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>

            {weekPlan.notes && (
              <p className="text-xs text-muted-foreground font-body leading-relaxed">{weekPlan.notes}</p>
            )}
            <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5">
              <Link href="/grocery">
                Montar lista de compras
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </section>

      {/* Section 2 — nutri's banco de opções + per-meal swap */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Opções por refeição
        </h2>

        {!hasOptions ? (
          <Card className="border-0 shadow-sm p-5 text-sm text-muted-foreground font-body leading-relaxed">
            Seu nutricionista ainda não montou opções de refeição. Assim que ele enviar, elas
            aparecem aqui — e você poderá trocar uma por uma alternativa parecida quando quiser.
          </Card>
        ) : (
          MEAL_TYPES.map((t) => {
            const list = grouped.get(t) ?? []
            if (list.length === 0) return null
            return (
              <div key={t} className="space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {LABEL[t]}
                </h3>
                <div className="space-y-2">
                  {list.map((o) => {
                    const swap = swapByParent.get(o.id)
                    const shown = swap ?? o
                    const isSwapped = Boolean(swap)
                    const busy = busyId === o.id
                    return (
                      <Card key={o.id} className="border-0 shadow-sm p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{shown.title}</span>
                            {isSwapped && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                <Sparkles className="w-2.5 h-2.5" />
                                Sua variação
                              </span>
                            )}
                          </div>
                          {shown.description && (
                            <p className="text-xs text-muted-foreground font-body mt-1 leading-relaxed">
                              {shown.description}
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground/80 font-body mt-1.5">
                            {macroLine(shown.macros)}
                          </p>
                          {isSwapped && (
                            <p className="text-[11px] text-muted-foreground/60 font-body mt-1 italic">
                              Original da nutri: {o.title}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                          <button
                            type="button"
                            onClick={() => handleSwap(o.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:opacity-80 disabled:opacity-50"
                          >
                            {busy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            {isSwapped ? "Gerar outra alternativa" : "Trocar por algo parecido"}
                          </button>
                          {isSwapped && swap && (
                            <button
                              type="button"
                              onClick={() => handleRevert(swap, o.id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              Voltar ao original
                            </button>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </section>

      <Button asChild variant="outline" className="gap-2 rounded-xl w-full">
        <Link href="/log">
          Registrar uma refeição
          <ArrowRight className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  )
}
