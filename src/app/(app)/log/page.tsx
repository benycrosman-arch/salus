"use client"

import { useState, useRef } from "react"
import { Camera, Upload, Loader2, ArrowRight, Zap, Leaf, AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScoreCircle } from "@/components/score-circle"
import { MacroBadge } from "@/components/macro-badge"
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

  const glycemicColor = {
    low: "text-emerald-700 bg-emerald-50 border-emerald-200",
    medium: "text-amber-700 bg-amber-50 border-amber-200",
    high: "text-red-600 bg-red-50 border-red-200",
  }

  return (
    <div className="page-enter min-h-screen bg-[#faf8f4] p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-4xl text-[#1a3a2a]">Log Meal</h1>
          <p className="mt-1 text-sm text-[#1a3a2a]/50">
            Upload a photo for AI-powered nutrition analysis
          </p>
        </div>

        {/* Upload Area */}
        {!result && (
          <Card
            className={cn(
              "relative overflow-hidden rounded-3xl border-2 border-dashed transition-all cursor-pointer",
              image ? "border-[#1a3a2a]/20" : "border-[#e7e2da] hover:border-[#1a3a2a]/30"
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
                  alt="Meal photo"
                  fill
                  className="object-cover rounded-3xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-3xl" />
                <div className="absolute bottom-5 left-5 right-5 flex gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-xl bg-white/90 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      resetLog()
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retake
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl bg-[#1a3a2a] text-white shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      analyzeMeal()
                    }}
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Analyze Meal
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-[#1a3a2a]/5 flex items-center justify-center">
                  <Camera className="h-10 w-10 text-[#1a3a2a]/40" />
                </div>
                <div>
                  <p className="font-display text-xl text-[#1a3a2a]">
                    Take a photo of your meal
                  </p>
                  <p className="text-sm text-[#1a3a2a]/40 mt-2 max-w-sm">
                    Our AI will identify foods, estimate portions, and score your meal instantly
                  </p>
                </div>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl border-[#1a3a2a]/15 hover:bg-[#1a3a2a]/5"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Loading State */}
        {analyzing && (
          <Card className="rounded-3xl p-10 flex flex-col items-center gap-5 border-0 shadow-lg ring-1 ring-black/[0.04]">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-[#1a3a2a]/5 flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-[#1a3a2a] animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-display text-xl text-[#1a3a2a]">Analyzing your meal...</p>
              <p className="text-sm text-[#1a3a2a]/40 mt-2">
                Identifying foods, estimating portions, and calculating your score
              </p>
            </div>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-5 page-enter">
            {/* Score */}
            <Card className="rounded-3xl p-8 flex flex-col items-center border-0 shadow-lg ring-1 ring-black/[0.04]">
              <ScoreCircle score={result.mealScore} size={180} />
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Badge variant="outline" className={cn("rounded-xl px-3 py-1", glycemicColor[result.glycemicImpact])}>
                  {result.glycemicImpact === "low" && "Low GI"}
                  {result.glycemicImpact === "medium" && "Medium GI"}
                  {result.glycemicImpact === "high" && "High GI"}
                </Badge>
                <Badge variant="outline" className="rounded-xl px-3 py-1 text-[#1a3a2a] bg-[#1a3a2a]/5 border-[#1a3a2a]/15">
                  <Leaf className="h-3 w-3 mr-1" />
                  {result.fiberDiversityCount} plant types
                </Badge>
                {result.processedFoodRatio > 0.3 && (
                  <Badge variant="outline" className="rounded-xl px-3 py-1 text-amber-700 bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {Math.round(result.processedFoodRatio * 100)}% processed
                  </Badge>
                )}
              </div>
            </Card>

            {/* Macros */}
            <div className="grid grid-cols-4 gap-2">
              <MacroBadge label="Cal" value={result.totalMacros.calories} unit="kcal" />
              <MacroBadge label="Protein" value={result.totalMacros.protein} unit="g" color="#1a3a2a" />
              <MacroBadge label="Carbs" value={result.totalMacros.carbs} unit="g" color="#d4520a" />
              <MacroBadge label="Fat" value={result.totalMacros.fat} unit="g" color="#6366f1" />
            </div>

            {/* Foods Detected */}
            <Card className="rounded-2xl p-5 border-0 shadow-md ring-1 ring-black/[0.04]">
              <h3 className="font-display text-base text-[#1a3a2a] mb-4">Foods Detected</h3>
              <div className="space-y-1">
                {result.foods.map((food: FoodItem, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2.5 border-b border-[#e7e2da]/50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          food.isProcessed ? "bg-amber-400" : "bg-emerald-500"
                        )}
                      />
                      <span className="text-sm font-medium text-[#1a3a2a]">{food.name}</span>
                      {food.isProcessed && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-200 rounded-md">
                          processed
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-[#1a3a2a]/40">
                      {food.quantity} {food.unit} · {food.estimatedCalories} cal
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* AI Feedback */}
            <Card className="rounded-2xl p-5 border-0 bg-gradient-to-br from-[#1a3a2a]/[0.04] to-[#1a3a2a]/[0.08] ring-1 ring-[#1a3a2a]/[0.08]">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#1a3a2a]/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-5 w-5 text-[#1a3a2a]" />
                </div>
                <div>
                  <h3 className="font-display text-base text-[#1a3a2a] mb-1">AI Feedback</h3>
                  <p className="text-sm text-[#1a3a2a]/70 leading-relaxed">
                    {result.feedback}
                  </p>
                </div>
              </div>
            </Card>

            {/* Swap Suggestions */}
            {result.swapSuggestions && result.swapSuggestions.length > 0 && (
              <Card className="rounded-2xl p-5 border-0 shadow-md ring-1 ring-black/[0.04]">
                <h3 className="font-display text-base text-[#1a3a2a] mb-3 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-[#d4520a]" />
                  Could Be Better
                </h3>
                <div className="space-y-2">
                  {result.swapSuggestions.map((swap: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 text-sm text-[#1a3a2a]/70 bg-[#faf8f4] rounded-xl p-3.5 ring-1 ring-black/[0.03]"
                    >
                      <span className="text-[#d4520a] font-bold text-lg leading-none">+</span>
                      <span className="leading-relaxed">{swap}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Log Another */}
            <Button
              variant="outline"
              className="w-full rounded-2xl border-[#1a3a2a]/15 py-6 text-[#1a3a2a] hover:bg-[#1a3a2a]/5"
              onClick={resetLog}
            >
              <Camera className="h-4 w-4 mr-2" />
              Log Another Meal
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
