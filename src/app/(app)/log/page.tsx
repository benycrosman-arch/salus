"use client"

import { useState, useRef } from "react"
import { Camera, Upload, Loader2, ArrowRight, Zap, Leaf, AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { MealAnalysis, FoodItem } from "@/lib/types"
import { cn } from "@/lib/utils"
import Image from "next/image"

export default function LogPage() {
  const [image, setImage] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<MealAnalysis | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setResult(null)
    const reader = new FileReader()
    reader.onloadend = () => setImage(reader.result as string)
    reader.readAsDataURL(selected)
  }

  const analyzeMeal = async () => {
    if (!file) return
    setAnalyzing(true)
    try {
      const res = await fetch("/api/meals/mock", { method: "POST" })
      const data: MealAnalysis = await res.json()
      setResult(data)
    } catch {
      console.error("Analysis failed")
    } finally {
      setAnalyzing(false)
    }
  }

  const resetLog = () => {
    setImage(null)
    setFile(null)
    setResult(null)
  }

  const glycemicLabel = { low: "GI Baixo", medium: "GI Médio", high: "GI Alto" }
  const glycemicStyle = {
    low: "text-[#4a7c4a] bg-[#4a7c4a]/8 border-[#4a7c4a]/20",
    medium: "text-[#c8a538] bg-[#c8a538]/8 border-[#c8a538]/20",
    high: "text-[#c4614a] bg-[#c4614a]/8 border-[#c4614a]/20",
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl italic text-[#1a3a2a]">Registrar refeição</h1>
        <p className="mt-1 text-sm text-[#1a3a2a]/50">
          Fotografe o prato para análise nutricional com IA
        </p>
      </div>

      {/* Upload Area */}
      {!result && (
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border-2 border-dashed transition-all cursor-pointer",
            image ? "border-[#1a3a2a]/20" : "border-[#e4ddd4] hover:border-[#1a3a2a]/25"
          )}
          onClick={() => !image && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          {image ? (
            <div className="relative aspect-[4/3]">
              <Image
                src={image}
                alt="Foto da refeição"
                fill
                className="object-cover rounded-3xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-3xl" />
              <div className="absolute bottom-5 left-5 right-5 flex gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl bg-white/90 backdrop-blur-sm text-[#1a3a2a] font-semibold"
                  onClick={(e) => { e.stopPropagation(); resetLog() }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Refazer
                </Button>
                <Button
                  size="sm"
                  className="flex-1 rounded-xl bg-[#1a3a2a] text-white shadow-lg font-semibold"
                  onClick={(e) => { e.stopPropagation(); analyzeMeal() }}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analisando...</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-2" />Analisar prato</>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-[#1a3a2a]/5 flex items-center justify-center">
                <Camera className="h-10 w-10 text-[#1a3a2a]/30" />
              </div>
              <div>
                <p className="font-serif text-2xl italic text-[#1a3a2a]">
                  Fotografe seu prato
                </p>
                <p className="text-sm text-[#1a3a2a]/40 mt-2 max-w-sm">
                  A IA identifica alimentos, estima porções e pontua a refeição em segundos
                </p>
              </div>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl border-[#1a3a2a]/15 text-[#1a3a2a] hover:bg-[#1a3a2a]/5 font-semibold"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Enviar foto
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {analyzing && (
        <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] p-12 flex flex-col items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-[#1a3a2a]/5 flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-[#1a3a2a] animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-serif text-2xl italic text-[#1a3a2a]">Analisando seu prato...</p>
            <p className="text-sm text-[#1a3a2a]/40 mt-2">
              Identificando alimentos, estimando porções e calculando score
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 page-enter">
          {/* Score card */}
          <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] p-8 flex flex-col items-center gap-5">
            {/* Score circle */}
            <div className="relative">
              {(() => {
                const r = 56
                const circ = 2 * Math.PI * r
                const offset = circ - (result.mealScore / 100) * circ
                const color = result.mealScore >= 80 ? "#1a3a2a" : result.mealScore >= 60 ? "#4a7c4a" : result.mealScore >= 40 ? "#c8a538" : "#c4614a"
                return (
                  <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
                    <circle cx="72" cy="72" r={r} fill="none" stroke="#e4ddd4" strokeWidth="8" />
                    <circle cx="72" cy="72" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
                  </svg>
                )
              })()}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-serif text-4xl italic text-[#1a3a2a]">{result.mealScore}</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#1a3a2a]/40">Score</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className={cn("rounded-full px-3 py-1 text-xs font-semibold", glycemicStyle[result.glycemicImpact])}>
                {glycemicLabel[result.glycemicImpact]}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold text-[#4a7c4a] bg-[#4a7c4a]/8 border-[#4a7c4a]/20">
                <Leaf className="h-3 w-3 mr-1" />
                {result.fiberDiversityCount} tipos de plantas
              </Badge>
              {result.processedFoodRatio > 0.3 && (
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold text-[#c8a538] bg-[#c8a538]/8 border-[#c8a538]/20">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {Math.round(result.processedFoodRatio * 100)}% processado
                </Badge>
              )}
            </div>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: "Calorias", v: result.totalMacros.calories, u: "kcal", c: "#1a3a2a" },
              { l: "Proteína", v: result.totalMacros.protein, u: "g", c: "#1a3a2a" },
              { l: "Carboidratos", v: result.totalMacros.carbs, u: "g", c: "#c4614a" },
              { l: "Gordura", v: result.totalMacros.fat, u: "g", c: "#4a7c4a" },
            ].map(({ l, v, u, c }) => (
              <div key={l} className="rounded-2xl bg-white ring-1 ring-black/[0.04] p-3 text-center">
                <p className="text-[9px] font-medium uppercase tracking-wider text-[#1a3a2a]/40">{l}</p>
                <p className="text-lg font-bold mt-1" style={{ color: c }}>{v}</p>
                <p className="text-[9px] text-[#1a3a2a]/30">{u}</p>
              </div>
            ))}
          </div>

          {/* Foods Detected */}
          <div className="rounded-2xl bg-white ring-1 ring-black/[0.04] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#1a3a2a]/40 mb-4">Alimentos detectados</p>
            <div className="divide-y divide-[#e4ddd4]/50">
              {result.foods.map((food: FoodItem, i: number) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", food.isProcessed ? "bg-[#c8a538]" : "bg-[#4a7c4a]")} />
                    <span className="text-sm font-medium text-[#1a3a2a]">{food.name}</span>
                    {food.isProcessed && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#c8a538] bg-[#c8a538]/10 px-1.5 py-0.5 rounded">
                        processado
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#1a3a2a]/35">
                    {food.quantity} {food.unit} · {food.estimatedCalories} cal
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Feedback */}
          <div className="rounded-2xl bg-[#1a3a2a] p-5 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-1">Análise da IA</p>
              <p className="text-sm text-white/80 leading-relaxed">{result.feedback}</p>
            </div>
          </div>

          {/* Swap Suggestions */}
          {result.swapSuggestions && result.swapSuggestions.length > 0 && (
            <div className="rounded-2xl bg-white ring-1 ring-black/[0.04] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#1a3a2a]/40 mb-3 flex items-center gap-1.5">
                <ArrowRight className="h-3 w-3 text-[#c4614a]" />
                Pode melhorar
              </p>
              <div className="space-y-2">
                {result.swapSuggestions.map((swap: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-[#1a3a2a]/70 bg-[#faf8f4] rounded-xl p-3.5 ring-1 ring-black/[0.03]">
                    <span className="text-[#c4614a] font-bold text-base leading-none mt-px">+</span>
                    <span className="leading-relaxed">{swap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Log Another */}
          <Button
            variant="outline"
            className="w-full rounded-2xl border-[#1a3a2a]/15 py-6 text-[#1a3a2a] font-semibold hover:bg-[#1a3a2a]/5"
            onClick={resetLog}
          >
            <Camera className="h-4 w-4 mr-2" />
            Registrar outra refeição
          </Button>
        </div>
      )}
    </div>
  )
}
