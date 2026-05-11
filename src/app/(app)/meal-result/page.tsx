"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  ArrowLeft, TrendingUp, TrendingDown, RefreshCw,
  CheckCircle2, ArrowRight, Loader2, Flag, Camera, Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { track } from "@/lib/posthog"
import { createClient } from "@/lib/supabase/client"

function scoreColor(score: number) {
  if (score >= 90) return { stroke: "#4a6b4a", text: "text-score-excellent", label: "Excelente" }
  if (score >= 75) return { stroke: "#6b8e4e", text: "text-score-great", label: "Ótimo" }
  if (score >= 60) return { stroke: "#c8a538", text: "text-score-good", label: "Bom" }
  if (score >= 40) return { stroke: "#d97742", text: "text-score-warning", label: "Atenção" }
  return { stroke: "#c0544d", text: "text-score-danger", label: "Evitar" }
}

function AnimatedScoreCircle({ score, size = 160 }: { score: number; size?: number }) {
  const [animated, setAnimated] = useState(false)
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const { stroke, label } = scoreColor(score)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 112 112" className="-rotate-90">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="#e6e0d4" strokeWidth="6" opacity="0.5" />
        <circle
          cx="56" cy="56" r={radius}
          fill="none" stroke={stroke} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? offset : circumference}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-sans font-bold text-4xl" style={{ color: stroke }}>{score}</span>
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

interface FoodItemView {
  name: string
  quantity?: string
  quantity_g?: number
}

interface MealRow {
  id: string
  meal_type: string | null
  logged_at: string
  foods_detected: FoodItemView[] | null
  macros: { calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number } | null
  score: number
  score_band: string | null
  ai_analysis: {
    feedback?: string
    swapSuggestions?: string[]
    positives?: string[]
    improvements?: string[]
    swaps?: Array<{ from: string; to: string; delta?: number; reason?: string }>
  } | null
}

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: "Café da manhã",
  snack1: "Lanche da manhã",
  lunch: "Almoço",
  snack2: "Lanche da tarde",
  dinner: "Jantar",
  other: "Refeição",
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

function formatQuantity(item: FoodItemView): string {
  if (item.quantity) return item.quantity
  if (typeof item.quantity_g === "number" && item.quantity_g > 0) return `${Math.round(item.quantity_g)}g`
  return ""
}

export default function MealResultPage() {
  const router = useRouter()
  const search = useSearchParams()
  const supabase = createClient()
  const mealId = search.get("id")

  const [meal, setMeal] = useState<MealRow | null>(null)
  const [delta, setDelta] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!mealId) {
      setError("Refeição não encontrada.")
      setLoading(false)
      return
    }
    ;(async () => {
      const { data, error } = await supabase
        .from("meals")
        .select("id,meal_type,logged_at,foods_detected,macros,score,score_band,ai_analysis")
        .eq("id", mealId)
        .maybeSingle<MealRow>()

      if (cancelled) return

      if (error || !data) {
        setError("Não conseguimos carregar essa refeição.")
        setLoading(false)
        return
      }
      setMeal(data)

      // Compare to user's avg score over last 14 days, excluding this meal.
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      const { data: history } = await supabase
        .from("meals")
        .select("score")
        .gte("logged_at", fourteenDaysAgo.toISOString())
        .neq("id", data.id)
      if (cancelled) return
      if (history && history.length > 0) {
        const avg = history.reduce((acc, m) => acc + (m.score ?? 0), 0) / history.length
        setDelta(Math.round(data.score - avg))
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [mealId, supabase])

  const handleDelete = async () => {
    if (!meal || deleting) return
    if (!window.confirm("Excluir esta refeição? Essa ação não pode ser desfeita.")) return
    setDeleting(true)
    const { error: delErr } = await supabase.from("meals").delete().eq("id", meal.id)
    if (delErr) {
      toast.error("Não consegui excluir essa refeição. Tenta de novo.")
      setDeleting(false)
      return
    }
    track("meal_deleted", { meal_id: meal.id, score: meal.score, surface: "meal-result" })
    toast.success("Refeição excluída.")
    router.push("/dashboard")
    router.refresh()
  }

  const handleReportAI = async () => {
    if (!meal) return
    const reason = window.prompt(
      "O que está errado com esta análise?\n\n1 = Informação incorreta\n2 = Pode ser prejudicial\n3 = Enganosa\n4 = Ofensiva\n5 = Outro\n\nDigite o número:"
    )
    const map: Record<string, string> = {
      "1": "incorrect", "2": "harmful", "3": "misleading", "4": "offensive", "5": "other",
    }
    const mapped = reason ? map[reason.trim()] : null
    if (!mapped) return
    const note = window.prompt("Quer adicionar um comentário? (opcional)") ?? ""
    const res = await fetch("/api/ai/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: mapped,
        note,
        context: { surface: "meal-result", meal_id: meal.id, score: meal.score },
      }),
    })
    if (!res.ok) {
      toast.error("Não consegui enviar seu reporte. Tenta de novo.")
      return
    }
    track("ai_report_submitted", { reason: mapped, surface: "meal-result" })
    toast.success("Obrigado. Vamos revisar essa análise.")
  }

  if (loading) {
    return (
      <div className="page-enter flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !meal) {
    return (
      <div className="page-enter space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground font-sans">Refeição</h1>
        </div>
        <Card className="border-0 shadow-md p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground font-body">{error || "Refeição não encontrada."}</p>
          <Button onClick={() => router.push("/log")} className="gap-2">
            <Camera className="w-4 h-4" />
            Registrar nova refeição
          </Button>
        </Card>
      </div>
    )
  }

  const macros = meal.macros ?? {}
  const calories = macros.calories ?? 0
  const protein_g = macros.protein ?? 0
  const carbs_g = macros.carbs ?? 0
  const fat_g = macros.fat ?? 0
  const fiber_g = macros.fiber ?? 0
  const foods = meal.foods_detected ?? []
  const a = meal.ai_analysis ?? {}
  const feedback = typeof a.feedback === "string" ? a.feedback.trim() : ""
  const positives = Array.isArray(a.positives) ? a.positives : []
  const improvements = Array.isArray(a.improvements) ? a.improvements : []
  // Tolerate either pre-structured swaps or the simpler swapSuggestions array
  const swaps = Array.isArray(a.swaps)
    ? a.swaps
    : Array.isArray(a.swapSuggestions)
      ? a.swapSuggestions.map((s) => ({ from: "", to: s, delta: undefined, reason: undefined }))
      : []

  const macroItems = [
    { label: "Proteína", value: protein_g, unit: "g", max: 60, color: "bg-primary" },
    { label: "Carboidratos", value: carbs_g, unit: "g", max: 100, color: "bg-accent" },
    { label: "Gordura", value: fat_g, unit: "g", max: 60, color: "bg-warning" },
    { label: "Fibras", value: fiber_g, unit: "g", max: 25, color: "bg-success" },
  ]

  const mealTypeLabel = MEAL_TYPE_LABEL[meal.meal_type ?? "other"] ?? "Refeição"

  return (
    <div className="page-enter space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground font-sans">{mealTypeLabel} salvo</h1>
          <p className="text-sm text-muted-foreground font-body">Hoje às {formatTime(meal.logged_at)}</p>
        </div>
      </div>

      {/* Score + delta */}
      <Card className="border-0 shadow-md p-6 flex flex-col items-center gap-4">
        <AnimatedScoreCircle score={meal.score} size={160} />
        {delta !== null && delta !== 0 && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${delta > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {delta > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {delta > 0 ? "+" : ""}{delta} vs. sua média
          </div>
        )}
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-body">{calories} kcal</p>
        </div>
      </Card>

      {/* Foods detected */}
      {foods.length > 0 && (
        <Card className="border-0 shadow-md p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Alimentos</h2>
          <div className="flex flex-wrap gap-2">
            {foods.map((food, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-muted rounded-full pl-3 pr-3 py-1.5">
                <span className="text-sm font-medium text-foreground">{food.name}</span>
                {formatQuantity(food) && (
                  <span className="text-xs text-muted-foreground font-body">{formatQuantity(food)}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Macros */}
      <Card className="border-0 shadow-md p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Macronutrientes</h2>
        {macroItems.map((m) => (
          <div key={m.label}>
            <div className="flex justify-between mb-1.5">
              <span className="text-sm font-medium text-foreground font-body">{m.label}</span>
              <span className="text-sm font-semibold text-foreground">{m.value}{m.unit}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${m.color} transition-all duration-700`}
                style={{ width: `${Math.min((m.value / m.max) * 100, 100)}%` }} />
            </div>
          </div>
        ))}
      </Card>

      {/* Feedback (single-sentence) */}
      {feedback && (
        <Card className="border-0 shadow-md p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Comentário</h2>
          </div>
          <p className="text-sm text-muted-foreground font-body leading-relaxed">{feedback}</p>
        </Card>
      )}

      {/* Pros / Cons (only if the analysis returned them) */}
      {(positives.length > 0 || improvements.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {positives.length > 0 && (
            <Card className="border-0 shadow-md p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Pontos positivos</h2>
              <ul className="space-y-2">
                {positives.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-success mt-2 shrink-0" />
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">{p}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {improvements.length > 0 && (
            <Card className="border-0 shadow-md p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">A melhorar</h2>
              <ul className="space-y-2">
                {improvements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-warning mt-2 shrink-0" />
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">{imp}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Swaps */}
      {swaps.length > 0 && (
        <Card className="border-0 shadow-md p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Trocas sugeridas</h2>
          </div>
          <div className="space-y-3">
            {swaps.map((swap, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/60">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {swap.from && (
                      <>
                        <span className="text-sm font-medium text-muted-foreground line-through font-body">{swap.from}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      </>
                    )}
                    <span className="text-sm font-semibold text-foreground font-body">{swap.to}</span>
                    {typeof swap.delta === "number" && swap.delta !== 0 && (
                      <Badge className="bg-success/10 text-success text-xs rounded-full border-0">{swap.delta > 0 ? "+" : ""}{swap.delta}</Badge>
                    )}
                  </div>
                  {swap.reason && <p className="text-xs text-muted-foreground mt-1 font-body">{swap.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button onClick={() => router.push("/dashboard")} className="flex-1 h-12 rounded-xl bg-primary font-semibold hover:bg-primary-hover gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Ir para o dashboard
        </Button>
        <Button onClick={() => router.push("/log")} variant="outline" className="h-12 rounded-xl border-2 font-medium font-body px-5 gap-2">
          <Camera className="w-4 h-4" />
          Outra refeição
        </Button>
      </div>

      {/* AI + health disclaimer */}
      <div className="pt-3 text-center">
        <p className="text-[11px] leading-relaxed text-muted-foreground font-body">
          Análise gerada por IA — valores são estimativas. Não substitui aconselhamento médico ou
          nutricional. Consulte um profissional de saúde antes de mudanças significativas na sua dieta.
        </p>
        <div className="mt-2 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
          <button
            type="button"
            onClick={handleReportAI}
            className="inline-flex items-center gap-1.5 hover:text-[#c4614a] transition-colors"
          >
            <Flag className="w-3 h-3" />
            Reportar problema nesta análise
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 hover:text-destructive transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Excluir refeição
          </button>
        </div>
      </div>
    </div>
  )
}
