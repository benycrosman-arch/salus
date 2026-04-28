"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  ArrowLeft, TrendingUp, TrendingDown, RefreshCw,
  CheckCircle2, AlertCircle, ArrowRight, Save, X, Loader2, Flag
} from "lucide-react"
import { toast } from "sonner"
import { track } from "@/lib/posthog"

// Score color helper
function scoreColor(score: number) {
  if (score >= 90) return { stroke: "#4a6b4a", bg: "bg-score-excellent/10", text: "text-score-excellent", label: "Excelente" }
  if (score >= 75) return { stroke: "#6b8e4e", bg: "bg-score-great/10", text: "text-score-great", label: "Ótimo" }
  if (score >= 60) return { stroke: "#c8a538", bg: "bg-score-good/10", text: "text-score-good", label: "Bom" }
  if (score >= 40) return { stroke: "#d97742", bg: "bg-score-warning/10", text: "text-score-warning", label: "Atenção" }
  return { stroke: "#c0544d", bg: "bg-score-danger/10", text: "text-score-danger", label: "Evitar" }
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

// Mock result data — will come from API in production
const mockResult = {
  score: 84,
  delta: +5,
  foods: [
    { name: "Salmão", quantity: "150g", confidence: 0.95 },
    { name: "Quinoa", quantity: "80g", confidence: 0.92 },
    { name: "Espinafre", quantity: "60g", confidence: 0.88 },
    { name: "Azeite de oliva", quantity: "10ml", confidence: 0.85 },
    { name: "Limão", quantity: "¼ unid.", confidence: 0.79 },
  ],
  macros: { protein_g: 42, carbs_g: 38, fat_g: 18, fiber_g: 6, calories: 478 },
  analysis: {
    positives: [
      "Excelente fonte de ômega-3 com o salmão",
      "Alta diversidade vegetal — espinafre + quinoa",
      "Fibras acima da média da sua dieta",
    ],
    improvements: [
      "Adicione mais variedade de vegetais coloridos",
      "Considere incluir leguminosas para mais fibra",
      "Sódio um pouco elevado — menos shoyu na próxima",
    ],
  },
  swaps: [
    { from: "Arroz branco", to: "Quinoa ou arroz integral", delta: +8, reason: "Sobe menos o açúcar no sangue e tem mais fibras" },
    { from: "Óleo de girassol", to: "Azeite extra virgem", delta: +5, reason: "Mais antioxidantes e ômega-9" },
  ],
}

export default function MealResultPage() {
  const router = useRouter()
  const [foods, setFoods] = useState(mockResult.foods)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { macros, analysis, swaps, score, delta } = mockResult

  const handleSave = async () => {
    if (saved) return
    setSaving(true)
    try {
      const res = await fetch("/api/meals/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: foods,
          totals: {
            kcal: macros.calories,
            protein: macros.protein_g,
            carbs: macros.carbs_g,
            fat: macros.fat_g,
            fiber: macros.fiber_g,
          },
          meal_type: "other",
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Não foi possível salvar a refeição.")
        return
      }
      setSaved(true)
      track("meal_logged", { source: "photo", calories: macros.calories, score, items: foods.length })
      toast.success("Refeição salva!")
      setTimeout(() => router.push("/dashboard"), 800)
    } catch (err) {
      console.error(err)
      toast.error("Erro ao salvar a refeição.")
    } finally {
      setSaving(false)
    }
  }

  const handleAddNote = () => {
    toast.info("Notas por refeição em breve.")
  }

  const handleReportAI = async () => {
    const reason = window.prompt(
      "O que está errado com esta análise?\n\n1 = Informação incorreta\n2 = Pode ser prejudicial\n3 = Enganosa\n4 = Ofensiva\n5 = Outro\n\nDigite o número:"
    )
    const map: Record<string, string> = {
      "1": "incorrect", "2": "harmful", "3": "misleading", "4": "offensive", "5": "other",
    }
    const mapped = reason ? map[reason.trim()] : null
    if (!mapped) return
    const note = window.prompt("Quer adicionar um comentário? (opcional)") ?? ""
    await fetch("/api/ai/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: mapped,
        note,
        context: { surface: "meal-result", content: JSON.stringify({ foods, score }) },
      }),
    })
    track("ai_report_submitted", { reason: mapped, surface: "meal-result" })
    toast.success("Obrigado. Vamos revisar essa análise.")
  }

  const macroItems = [
    { label: "Proteína", value: macros.protein_g, unit: "g", max: 60, color: "bg-primary" },
    { label: "Carboidratos", value: macros.carbs_g, unit: "g", max: 100, color: "bg-accent" },
    { label: "Gordura", value: macros.fat_g, unit: "g", max: 60, color: "bg-warning" },
    { label: "Fibras", value: macros.fiber_g, unit: "g", max: 25, color: "bg-success" },
  ]

  return (
    <div className="page-enter space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground font-sans">Resultado da Refeição</h1>
          <p className="text-sm text-muted-foreground font-body">Hoje às 12:34</p>
        </div>
      </div>

      {/* Score + delta */}
      <Card className="border-0 shadow-md p-6 flex flex-col items-center gap-4">
        <AnimatedScoreCircle score={score} size={160} />
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${delta >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
          {delta >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {delta >= 0 ? "+" : ""}{delta} vs. sua média
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Bowl de Salmão e Quinoa</p>
          <p className="text-xs text-muted-foreground font-body mt-0.5">{macros.calories} kcal</p>
        </div>
      </Card>

      {/* Foods detected */}
      <Card className="border-0 shadow-md p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Alimentos Detectados</h2>
        <div className="flex flex-wrap gap-2">
          {foods.map((food, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-muted rounded-full pl-3 pr-2 py-1.5">
              <span className="text-sm font-medium text-foreground">{food.name}</span>
              <span className="text-xs text-muted-foreground font-body">{food.quantity}</span>
              <button onClick={() => setFoods(foods.filter((_, fi) => fi !== i))}
                className="w-4 h-4 rounded-full bg-muted-foreground/20 flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors ml-1">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      </Card>

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

      {/* Analysis */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-0 shadow-md p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <h2 className="text-sm font-semibold text-foreground">Pontos positivos</h2>
          </div>
          <ul className="space-y-2">
            {analysis.positives.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success mt-2 shrink-0" />
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{p}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="border-0 shadow-md p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-semibold text-foreground">A melhorar</h2>
          </div>
          <ul className="space-y-2">
            {analysis.improvements.map((imp, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-warning mt-2 shrink-0" />
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{imp}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Swaps */}
      <Card className="border-0 shadow-md p-5">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Trocas Sugeridas</h2>
        </div>
        <div className="space-y-3">
          {swaps.map((swap, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/60">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground line-through font-body">{swap.from}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground font-body">{swap.to}</span>
                  <Badge className="bg-success/10 text-success text-xs rounded-full border-0">+{swap.delta}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-body">{swap.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving || saved}
          className="flex-1 h-12 rounded-xl bg-primary font-semibold hover:bg-primary-hover transition-all gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Salvo
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar refeição
            </>
          )}
        </Button>
        <Button
          onClick={handleAddNote}
          variant="outline"
          className="h-12 rounded-xl border-2 font-medium font-body px-5"
        >
          Adicionar nota
        </Button>
      </div>

      {/* AI + health disclaimer (required for App Store / Play Store health categories) */}
      <div className="pt-3 text-center">
        <p className="text-[11px] leading-relaxed text-muted-foreground font-body">
          Análise gerada por IA — valores são estimativas. Não substitui aconselhamento médico ou
          nutricional. Consulte um profissional de saúde antes de mudanças significativas na sua dieta.
        </p>
        <button
          type="button"
          onClick={handleReportAI}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-[#c4614a] transition-colors"
        >
          <Flag className="w-3 h-3" />
          Reportar problema nesta análise
        </button>
      </div>
    </div>
  )
}
