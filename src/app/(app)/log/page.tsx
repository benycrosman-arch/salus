"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Camera, Upload, Loader2, ArrowRight, Zap, Leaf, AlertTriangle,
  RotateCcw, ChevronRight, CheckCircle2, AlertCircle, HelpCircle,
  MapPin, CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import type { MealAnalysis, FoodItem, ParsedFoodItem, TextLogResult, CalorieBias } from "@/lib/types"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { toast } from "sonner"
import { RestaurantMenuTab } from "@/components/log/restaurant-menu-tab"
import { callEdgeFunction } from "@/lib/ai-client"
import { useProStatus } from "@/lib/use-pro-status"
import { PaywallModal } from "@/components/paywall-modal"
import { FeatureBlockerModal } from "@/components/feature-blocker-modal"
import { useFeatureQuota } from "@/lib/use-feature-quota"
import { useTranslations } from "next-intl"

// ─── Text mode ────────────────────────────────────────────────────────────────

function BiasPicker({ value, onChange }: { value: CalorieBias; onChange: (v: CalorieBias) => void }) {
  const opts: { val: CalorieBias; label: string }[] = [
    { val: "conservative", label: "Conservador" },
    { val: "balanced", label: "Equilibrado" },
    { val: "generous", label: "Generoso" },
  ]
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-[#f5f0ea] w-fit">
      {opts.map(({ val, label }) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
            value === val
              ? "bg-white text-[#1a3a2a] shadow-sm"
              : "text-[#1a3a2a]/50 hover:text-[#1a3a2a]/70"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color = confidence >= 0.8 ? "#4a7c4a" : confidence >= 0.5 ? "#c8a538" : "#c4614a"
  const Icon = confidence >= 0.8 ? CheckCircle2 : confidence >= 0.5 ? AlertCircle : HelpCircle
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1a3a2a]/60">Confiança</span>
        <div className="flex items-center gap-1">
          <Icon className="h-3 w-3" style={{ color }} />
          <span className="text-xs font-semibold" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-[#e4ddd4] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

const SOURCE_LABELS: Record<string, string> = {
  usda: "USDA",
  branded: "Marca",
  estimate: "Estimado",
}

function FoodChip({
  item,
  onTap,
  onRemove,
}: {
  item: ParsedFoodItem
  onTap: (item: ParsedFoodItem) => void
  onRemove: (id: string) => void
}) {
  const dotColor =
    item.confidence >= 0.8 ? "#4a7c4a" : item.confidence >= 0.5 ? "#c8a538" : "#c4614a"

  return (
    <div className="flex items-center gap-0 group rounded-xl ring-1 ring-black/[0.06] bg-white overflow-hidden">
      <button
        onClick={() => onTap(item)}
        className="flex items-center gap-2.5 px-3.5 py-2.5 flex-1 text-left hover:bg-[#1a3a2a]/[0.03] transition-colors"
      >
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-[#1a3a2a] truncate block">{item.name_resolved}</span>
          <span className="text-[11px] text-[#1a3a2a]/60">
            {item.qty} {item.unit}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-sm font-bold text-[#1a3a2a]">{item.kcal}</span>
          <span className="text-[10px] text-[#1a3a2a]/60">kcal</span>
          <ChevronRight className="h-3.5 w-3.5 text-[#1a3a2a]/20" />
        </div>
      </button>
      <button
        onClick={() => onRemove(item.id)}
        className="px-3 py-2.5 text-[#1a3a2a]/20 hover:text-[#c4614a] hover:bg-[#c4614a]/5 transition-colors border-l border-black/[0.04] text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}

function ReasoningDialog({
  item,
  onClose,
}: {
  item: ParsedFoodItem | null
  onClose: () => void
}) {
  if (!item) return null
  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl border-0 shadow-2xl max-w-sm mx-auto p-0 overflow-hidden">
        <div className="bg-[#1a3a2a] px-6 pt-6 pb-5">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl italic text-white text-left leading-tight">
              {item.name_resolved}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60 bg-white/10 px-2 py-0.5 rounded-md">
              {SOURCE_LABELS[item.source] ?? item.source}
            </span>
            <span className="text-[11px] text-white/50">
              {item.qty} {item.unit}
            </span>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Macros grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: "Calorias", v: item.kcal, u: "kcal", c: "#1a3a2a" },
              { l: "Proteína", v: item.protein_g, u: "g", c: "#1a3a2a" },
              { l: "Carbs", v: item.carbs_g, u: "g", c: "#c4614a" },
              { l: "Gordura", v: item.fat_g, u: "g", c: "#4a7c4a" },
            ].map(({ l, v, u, c }) => (
              <div key={l} className="rounded-xl bg-[#faf8f4] p-2.5 text-center">
                <p className="text-[8px] font-semibold uppercase tracking-wider text-[#1a3a2a]/60">{l}</p>
                <p className="text-base font-bold mt-0.5" style={{ color: c }}>{v}</p>
                <p className="text-[8px] text-[#1a3a2a]/50">{u}</p>
              </div>
            ))}
          </div>

          <ConfidenceBar confidence={item.confidence} />

          {/* Reasoning */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1a3a2a]/60 mb-2">
              Como o Salus decidiu
            </p>
            <p className="text-sm text-[#1a3a2a]/70 leading-relaxed bg-[#faf8f4] rounded-xl p-3.5">
              {item.reasoning}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl border-[#1a3a2a]/15 text-[#1a3a2a]/60 hover:bg-[#1a3a2a]/5 font-semibold"
            onClick={onClose}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TotalsBar({ totals }: { totals: TextLogResult["totals"] }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {[
        { l: "Calorias", v: totals.kcal, u: "kcal", c: "#1a3a2a" },
        { l: "Proteína", v: totals.protein, u: "g", c: "#1a3a2a" },
        { l: "Carbs", v: totals.carbs, u: "g", c: "#c4614a" },
        { l: "Gordura", v: totals.fat, u: "g", c: "#4a7c4a" },
        { l: "Fibra", v: totals.fiber, u: "g", c: "#4a7c4a" },
      ].map(({ l, v, u, c }) => (
        <div key={l} className="rounded-2xl bg-white ring-1 ring-black/[0.04] p-3 text-center">
          <p className="text-[9px] font-medium uppercase tracking-wider text-[#1a3a2a]/60 leading-tight">{l}</p>
          <p className="text-base font-bold mt-1" style={{ color: c }}>{v}</p>
          <p className="text-[9px] text-[#1a3a2a]/50">{u}</p>
        </div>
      ))}
    </div>
  )
}

async function detectNearbyRestaurant(lat: number, lon: number): Promise<string | null> {
  const radius = 100 // meters
  const query = `[out:json][timeout:5];node(around:${radius},${lat},${lon})[amenity=restaurant];out 1;`
  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
    if (!res.ok) return null
    const data = await res.json()
    const name = data?.elements?.[0]?.tags?.name
    return name ?? null
  } catch {
    return null
  }
}

function TextLogTab() {
  const router = useRouter()
  const [text, setText] = useState("")
  const [bias, setBias] = useState<CalorieBias>("balanced")
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<TextLogResult | null>(null)
  const [selectedItem, setSelectedItem] = useState<ParsedFoodItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [restaurant, setRestaurant] = useState<string | null>(null)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'found' | 'none'>('idle')
  const [paywallOpen, setPaywallOpen] = useState(false)
  const pro = useProStatus()

  // Silently try geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) return
    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const name = await detectNearbyRestaurant(pos.coords.latitude, pos.coords.longitude)
        if (name) {
          setRestaurant(name)
          setGeoStatus('found')
        } else {
          setGeoStatus('none')
        }
      },
      () => setGeoStatus('none'),
      { timeout: 6000, maximumAge: 60000 }
    )
  }, [])

  const parseFoods = useCallback(async () => {
    if (!text.trim()) return
    if (pro.loaded && !pro.isPro) {
      setPaywallOpen(true)
      return
    }
    setParsing(true)
    setError(null)
    try {
      const data = await callEdgeFunction<TextLogResult>("ai-parse-text", { text, bias, restaurant })
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setParsing(false)
    }
  }, [text, bias, restaurant, pro.loaded, pro.isPro])

  const removeItem = useCallback((id: string) => {
    setResult((prev) => {
      if (!prev) return prev
      const items = prev.items.filter((i) => i.id !== id)
      const totals = items.reduce(
        (acc, item) => ({
          kcal: acc.kcal + item.kcal,
          protein: acc.protein + item.protein_g,
          carbs: acc.carbs + item.carbs_g,
          fat: acc.fat + item.fat_g,
          fiber: acc.fiber + item.fiber_g,
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      )
      return { items, totals }
    })
  }, [])

  const saveMeal = useCallback(async () => {
    if (!result) return
    setSaving(true)
    try {
      const res = await fetch("/api/meals/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: result.items, totals: result.totals }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Falha ao salvar")
      }
      const data = await res.json().catch(() => ({}))
      setSaved(true)
      if (data?.meal_id) {
        router.push(`/meal-result?id=${data.meal_id}`)
      } else {
        setTimeout(() => reset(), 2500)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar refeição"
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }, [result, router])

  const reset = () => {
    setText("")
    setResult(null)
    setError(null)
    setSaved(false)
  }

  return (
    <div className="space-y-4">
      {/* Restaurant pill */}
      {geoStatus === 'found' && restaurant && (
        <div className="flex items-center gap-2 rounded-xl bg-[#1a3a2a]/5 px-3.5 py-2.5">
          <MapPin className="h-3.5 w-3.5 text-[#1a3a2a]/50 flex-shrink-0" />
          <p className="text-xs text-[#1a3a2a]/70 flex-1">
            Detectado: <span className="font-semibold text-[#1a3a2a]">{restaurant}</span>
            <span className="text-[#1a3a2a]/60"> — porções ajustadas para restaurante</span>
          </p>
          <button
            onClick={() => { setRestaurant(null); setGeoStatus('none') }}
            className="text-[#1a3a2a]/50 hover:text-[#1a3a2a]/50 text-base leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Bias picker */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1a3a2a]/60">
          Estimativa de calorias
        </p>
        <BiasPicker value={bias} onChange={setBias} />
        <p className="text-[11px] text-[#1a3a2a]/60">
          {bias === "conservative" && "Usa porções menores quando há dúvida"}
          {bias === "balanced" && "Usa porções típicas como referência"}
          {bias === "generous" && "Considera porções maiores estilo restaurante"}
        </p>
      </div>

      {/* Text input */}
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="O que você comeu? Ex: 2 ovos mexidos, fatia de pão integral, café com leite..."
          className="min-h-[120px] resize-none rounded-2xl border-[#e4ddd4] bg-white focus-visible:ring-[#1a3a2a]/20 text-[#1a3a2a] placeholder:text-[#1a3a2a]/50 text-sm leading-relaxed"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) parseFoods()
          }}
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#1a3a2a]/50">⌘↵ para analisar</p>
          <div className="flex gap-2">
            {(result || text) && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-[#1a3a2a]/60 hover:text-[#1a3a2a]/70 font-semibold"
                onClick={reset}
              >
                Limpar
              </Button>
            )}
            <Button
              size="sm"
              className="rounded-xl bg-[#1a3a2a] text-white font-semibold px-5"
              onClick={parseFoods}
              disabled={parsing || !text.trim()}
            >
              {parsing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Analisando...</>
              ) : (
                <><Zap className="h-3.5 w-3.5 mr-1.5" />Analisar</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-[#c4614a]/8 border border-[#c4614a]/20 p-4 text-sm text-[#c4614a]">
          {error}
        </div>
      )}

      {/* Loading */}
      {parsing && (
        <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] p-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1a3a2a]/5 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-[#1a3a2a] animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-serif text-xl italic text-[#1a3a2a]">Identificando alimentos...</p>
            <p className="text-xs text-[#1a3a2a]/60 mt-1">
              Estimando porções e calculando nutrientes
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !parsing && (
        <div className="space-y-4 page-enter">
          <TotalsBar totals={result.totals} />

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1a3a2a]/60">
              {result.items.length} {result.items.length === 1 ? "alimento" : "alimentos"} identificados
            </p>
            {result.items.map((item) => (
              <FoodChip
                key={item.id}
                item={item}
                onTap={setSelectedItem}
                onRemove={removeItem}
              />
            ))}
          </div>

          <Button
            className="w-full rounded-2xl bg-[#1a3a2a] text-white py-6 font-semibold text-sm"
            onClick={saveMeal}
            disabled={saving || saved}
          >
            {saved ? (
              <><CheckCircle className="h-4 w-4 mr-2" />Refeição salva!</>
            ) : saving ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
            ) : (
              "Salvar refeição"
            )}
          </Button>
        </div>
      )}

      <ReasoningDialog item={selectedItem} onClose={() => setSelectedItem(null)} />
      <PaywallModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  )
}

// ─── Photo mode (unchanged logic) ─────────────────────────────────────────────

function PhotoLogTab() {
  const router = useRouter()
  const [image, setImage] = useState<string | null>(null)
  const [photoText, setPhotoText] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<MealAnalysis | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [blockerOpen, setBlockerOpen] = useState(false)
  const pro = useProStatus()
  const quota = useFeatureQuota("meal_photo_analysis")
  const tq = useTranslations("quota")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setResult(null)
    const reader = new FileReader()
    reader.onloadend = () => setImage(reader.result as string)
    reader.readAsDataURL(selected)
  }

  const analyzeMeal = async () => {
    if (!image) return
    if (quota.loaded && quota.blocked) {
      setBlockerOpen(true)
      return
    }
    if (pro.loaded && !pro.isPro && !quota.loaded) {
      setPaywallOpen(true)
      return
    }
    setAnalyzing(true)
    try {
      const data = await callEdgeFunction<MealAnalysis>("ai-analyze", {
        image,
        text: photoText.trim() || undefined,
      })
      setResult(data)
    } catch (err) {
      console.error("Analysis failed", err)
      toast.error(err instanceof Error ? err.message : "Análise falhou")
    } finally {
      setAnalyzing(false)
      void quota.refetch()
    }
  }

  const saveMeal = async () => {
    if (!result) return
    setSaving(true)
    try {
      const totals = {
        kcal: result.totalMacros.calories,
        protein: result.totalMacros.protein,
        carbs: result.totalMacros.carbs,
        fat: result.totalMacros.fat,
        fiber: result.totalMacros.fiber
      }
      const ai_analysis = {
        feedback: result.feedback,
        swapSuggestions: result.swapSuggestions ?? [],
        glycemicImpact: result.glycemicImpact,
        fiberDiversityCount: result.fiberDiversityCount,
        processedFoodRatio: result.processedFoodRatio,
        mealScore: result.mealScore,
      }
      const res = await fetch("/api/meals/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: result.foods, totals, ai_analysis }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Falha ao salvar")
      }
      const data = await res.json().catch(() => ({}))
      setSaved(true)
      if (data?.meal_id) {
        router.push(`/meal-result?id=${data.meal_id}`)
      } else {
        setTimeout(() => resetLog(), 2500)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não consegui salvar a refeição."
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const resetLog = () => {
    setImage(null)
    setPhotoText("")
    setResult(null)
    setSaved(false)
  }

  const glycemicLabel = { low: "Pouco açúcar", medium: "Açúcar médio", high: "Muito açúcar" }
  const glycemicStyle = {
    low: "text-[#4a7c4a] bg-[#4a7c4a]/8 border-[#4a7c4a]/20",
    medium: "text-[#c8a538] bg-[#c8a538]/8 border-[#c8a538]/20",
    high: "text-[#c4614a] bg-[#c4614a]/8 border-[#c4614a]/20",
  }

  return (
    <div className="space-y-4">
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
            <div className="space-y-3">
              <div className="relative aspect-[4/3]">
                <Image src={image} alt="Foto da refeição" fill className="object-cover rounded-3xl" />
              </div>
              {/* Optional context — improves Opus 4.7 disambiguation */}
              <div onClick={(e) => e.stopPropagation()} className="px-1 pb-1">
                <Textarea
                  value={photoText}
                  onChange={(e) => setPhotoText(e.target.value.slice(0, 300))}
                  placeholder="Opcional: adicione contexto. Ex.: 'arroz integral com feijão preto, frango grelhado e salada'"
                  rows={2}
                  className="resize-none text-sm rounded-2xl border-[#e4ddd4] bg-[#faf8f4] focus:border-[#1a3a2a]/30"
                  disabled={analyzing}
                />
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground font-body px-1">
                  <span>Ajuda a IA a identificar pratos parecidos.</span>
                  <span className="tabular-nums">{photoText.length}/300</span>
                </div>
              </div>
              <div className="flex gap-3 px-1 pb-1">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl bg-white text-[#1a3a2a] font-semibold border border-[#e4ddd4]"
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
                <Camera className="h-10 w-10 text-[#1a3a2a]/50" />
              </div>
              <div>
                <p className="font-serif text-2xl italic text-[#1a3a2a]">Fotografe seu prato</p>
                <p className="text-sm text-[#1a3a2a]/60 mt-2 max-w-sm">
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
            <p className="text-sm text-[#1a3a2a]/60 mt-2">
              Identificando alimentos, estimando porções e calculando score
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {/* Quota indicator (gated tiers only — free + essencial) */}
      {quota.loaded && !quota.isUnlimited && quota.limit > 0 && !result && !analyzing && (
        <div className="flex items-center justify-between rounded-2xl bg-[#1a3a2a]/[0.04] px-4 py-2.5 text-xs">
          <span className="font-medium text-[#1a3a2a]/70">
            {quota.tier === 'essencial'
              ? (quota.remaining > 0
                ? tq('essencialRemaining', { remaining: quota.remaining, limit: quota.limit })
                : tq('essencialUsedAll'))
              : (quota.remaining > 0
                ? tq('freeRemaining', { remaining: quota.remaining, limit: quota.limit })
                : tq('freeUsedAll', { limit: quota.limit }))}
          </span>
          {quota.remaining <= 1 && (
            <span className="font-semibold text-[#c4614a]">
              {quota.remaining === 0 ? tq('upgradeShort') : tq('lastOne')}
            </span>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-4 page-enter">
          {/* Score card */}
          <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] p-8 flex flex-col items-center gap-5">
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
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#1a3a2a]/60">Score</span>
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
                <p className="text-[9px] font-medium uppercase tracking-wider text-[#1a3a2a]/60">{l}</p>
                <p className="text-lg font-bold mt-1" style={{ color: c }}>{v}</p>
                <p className="text-[9px] text-[#1a3a2a]/50">{u}</p>
              </div>
            ))}
          </div>

          {/* Photo quality warning */}
          {result.photoQualityIssue && (
            <div className="rounded-2xl bg-[#c8a538]/8 border border-[#c8a538]/20 p-4 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-[#c8a538] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#c8a538]">
                Qualidade da foto baixa — os resultados podem ser menos precisos. Tente uma foto com mais luz.
              </p>
            </div>
          )}

          {/* Foods Detected */}
          <div className="rounded-2xl bg-white ring-1 ring-black/[0.04] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#1a3a2a]/60 mb-4">Alimentos detectados</p>
            <div className="divide-y divide-[#e4ddd4]/50">
              {result.foods.map((food: FoodItem, i: number) => {
                const confColor = food.confidence === 'high' ? '#4a7c4a' : food.confidence === 'medium' ? '#c8a538' : '#c4614a'
                return (
                  <div key={i} className="py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: confColor }} />
                        <span className="text-sm font-medium text-[#1a3a2a]">{food.name}</span>
                        {food.isProcessed && (
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#c8a538] bg-[#c8a538]/10 px-1.5 py-0.5 rounded">
                            processado
                          </span>
                        )}
                        {food.cookingMethod && (
                          <span className="text-[9px] text-[#1a3a2a]/50 italic">{food.cookingMethod}</span>
                        )}
                      </div>
                      <span className="text-xs text-[#1a3a2a]/60 flex-shrink-0">
                        {food.quantity} {food.unit} · {food.estimatedCalories} kcal
                      </span>
                    </div>
                    {food.visualReasoning && (
                      <p className="text-[11px] text-[#1a3a2a]/60 leading-relaxed pl-4.5">{food.visualReasoning}</p>
                    )}
                    {food.alternative && food.confidence !== 'high' && (
                      <p className="text-[11px] text-[#c8a538] pl-4.5">
                        Pode ser: {food.alternative}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Correction prompt */}
          {result.correctionPrompt && (
            <div className="rounded-2xl bg-[#c4614a]/6 border border-[#c4614a]/15 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c4614a]/70 mb-1">Confirme a identificação</p>
              <p className="text-sm text-[#c4614a]/80 leading-relaxed">{result.correctionPrompt}</p>
            </div>
          )}

          {/* AI Feedback */}
          <div className="rounded-2xl bg-[#1a3a2a] p-5 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60 mb-1">Análise da IA</p>
              <p className="text-sm text-white/80 leading-relaxed">{result.feedback}</p>
            </div>
          </div>

          {/* Swap Suggestions */}
          {result.swapSuggestions && result.swapSuggestions.length > 0 && (
            <div className="rounded-2xl bg-white ring-1 ring-black/[0.04] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#1a3a2a]/60 mb-3 flex items-center gap-1.5">
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

          <div className="space-y-3 pt-2">
            <Button
              className="w-full rounded-2xl bg-[#1a3a2a] text-white py-6 font-semibold text-sm"
              onClick={saveMeal}
              disabled={saving || saved}
            >
              {saved ? (
                <><CheckCircle className="h-4 w-4 mr-2" />Refeição salva!</>
              ) : saving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
              ) : (
                "Salvar refeição"
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full rounded-2xl border-[#1a3a2a]/15 py-6 text-[#1a3a2a] font-semibold hover:bg-[#1a3a2a]/5"
              onClick={resetLog}
            >
              <Camera className="h-4 w-4 mr-2" />
              Registrar outra refeição
            </Button>
          </div>
        </div>
      )}
      <PaywallModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />
      <FeatureBlockerModal
        isOpen={blockerOpen}
        featureKey="meal_photo_analysis"
        tier={quota.tier}
        used={quota.used}
        limit={quota.limit}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LogPage() {
  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-serif text-4xl italic text-[#1a3a2a]">Registrar refeição</h1>
        <p className="mt-1 text-sm text-[#1a3a2a]/50">
          Descreva o que comeu, envie uma foto ou escaneie um cardápio
        </p>
      </div>

      <Tabs defaultValue="text">
        <TabsList className="w-full rounded-xl bg-[#f5f0ea] p-1 h-auto flex flex-wrap sm:flex-nowrap gap-1">
          <TabsTrigger
            value="text"
            className="flex-1 min-w-[4.5rem] rounded-lg text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1a3a2a] data-[state=active]:shadow-sm text-[#1a3a2a]/50 py-2"
          >
            Texto
          </TabsTrigger>
          <TabsTrigger
            value="photo"
            className="flex-1 min-w-[4.5rem] rounded-lg text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1a3a2a] data-[state=active]:shadow-sm text-[#1a3a2a]/50 py-2"
          >
            Foto
          </TabsTrigger>
          <TabsTrigger
            value="menu"
            className="flex-1 min-w-[4.5rem] rounded-lg text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1a3a2a] data-[state=active]:shadow-sm text-[#1a3a2a]/50 py-2"
          >
            Cardápio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-5">
          <TextLogTab />
        </TabsContent>

        <TabsContent value="photo" className="mt-5">
          <PhotoLogTab />
        </TabsContent>

        <TabsContent value="menu" className="mt-5">
          <RestaurantMenuTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
