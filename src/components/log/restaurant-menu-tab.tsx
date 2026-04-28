"use client"

import { useCallback, useRef, useState } from "react"
import Image from "next/image"
import {
  Loader2,
  MapPin,
  CheckCircle,
  UtensilsCrossed,
  Zap,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { CalorieBias, ParsedFoodItem, TextLogResult } from "@/lib/types"
import { AIClientError, callEdgeFunction } from "@/lib/ai-client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type GeoPhase = "need_permission" | "loading" | "places_error" | "ready"
type MenuLine = { id: string; name: string; priceText: string | null; section: string | null }
type PlaceRow = { id: string; name: string; vicinity?: string; location: { lat: number; lng: number } }

const SOURCE_LABELS: Record<string, string> = {
  usda: "USDA",
  branded: "Marca",
  estimate: "Estimado",
}

function BiasRow({ value, onChange }: { value: CalorieBias; onChange: (v: CalorieBias) => void }) {
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
          type="button"
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

function MenuTotalsBar({ totals }: { totals: TextLogResult["totals"] }) {
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

function MenuItemChip({
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
        type="button"
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
        type="button"
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

export function RestaurantMenuTab() {
  const [geoPhase, setGeoPhase] = useState<GeoPhase>("need_permission")
  const [placesError, setPlacesError] = useState<string | null>(null)
  const [places, setPlaces] = useState<PlaceRow[]>([])
  const [selectedPlace, setSelectedPlace] = useState<PlaceRow | "none" | null>(null)
  const [userLatLng, setUserLatLng] = useState<{ lat: number; lng: number } | null>(null)

  const [menuImage, setMenuImage] = useState<string | null>(null)
  const [menuLines, setMenuLines] = useState<MenuLine[]>([])
  const [scanMeta, setScanMeta] = useState<{ unreadable: boolean; rawNotes: string | null } | null>(null)
  const [scanning, setScanning] = useState(false)
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [bias, setBias] = useState<CalorieBias>("balanced")
  const [parseResult, setParseResult] = useState<TextLogResult | null>(null)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedParsed, setSelectedParsed] = useState<ParsedFoodItem | null>(null)

  const restaurantNameForParse =
    selectedPlace && selectedPlace !== "none" ? selectedPlace.name : undefined

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setPlacesError("Seu dispositivo não suporta localização.")
      setGeoPhase("places_error")
      return
    }
    setGeoPhase("loading")
    setPlacesError(null)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUserLatLng({ lat, lng })
        try {
          const res = await fetch("/api/places/nearby", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng, radiusMeters: 900 }),
          })
          const data = await res.json()
          if (!res.ok) {
            throw new Error(data.error || "Falha ao buscar restaurantes")
          }
          const list = data.places ?? []
          setPlaces(list)
          if (list.length === 0) {
            setPlacesError("Nenhum restaurante encontrado por perto. Você ainda pode escanear o cardápio e registrar.")
          } else {
            setPlacesError(null)
          }
          setGeoPhase("ready")
        } catch (e) {
          setPlacesError(e instanceof Error ? e.message : "Erro ao carregar lugares")
          setGeoPhase("places_error")
        }
      },
      () => {
        setPlacesError("Permissão de localização negada. Ative nas configurações do navegador para ver restaurantes próximos.")
        setGeoPhase("places_error")
      },
      { timeout: 15000, maximumAge: 120000, enableHighAccuracy: false }
    )
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setError(null)
    setParseResult(null)
    setSaved(false)
    setMenuLines([])
    setScanMeta(null)
    setSelectedLineIds(new Set())
    const reader = new FileReader()
    reader.onloadend = () => setMenuImage(reader.result as string)
    reader.readAsDataURL(selected)
  }

  const runScan = async () => {
    if (!menuImage) return
    setScanning(true)
    setError(null)
    try {
      const data = await callEdgeFunction<{
        unreadable: boolean
        rawNotes: string | null
        items: MenuLine[]
      }>("ai-scan-menu", { image: menuImage })
      setScanMeta({ unreadable: data.unreadable, rawNotes: data.rawNotes })
      setMenuLines(data.items ?? [])
      const all = new Set<string>((data.items ?? []).map((i) => i.id))
      setSelectedLineIds(all)
    } catch (err) {
      if (err instanceof AIClientError && err.status === 400 && err.body && typeof err.body === "object") {
        const b = err.body as { unreadable?: boolean; rawNotes?: string | null; items?: MenuLine[] }
        if (b.unreadable != null || b.items) {
          setScanMeta({ unreadable: Boolean(b.unreadable), rawNotes: b.rawNotes ?? null })
          setMenuLines(b.items ?? [])
          setSelectedLineIds(new Set())
        }
      }
      setError(err instanceof Error ? err.message : "Erro ao escanear")
    } finally {
      setScanning(false)
    }
  }

  const toggleLine = (id: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedLineIds(new Set(menuLines.map((l) => l.id)))
  }

  const clearSelection = () => {
    setSelectedLineIds(new Set())
  }

  const removeParsedItem = useCallback((id: string) => {
    setParseResult((prev) => {
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

  const runParse = useCallback(async () => {
    const names = menuLines
      .filter((l) => selectedLineIds.has(l.id))
      .map((l) => l.name)
    const text = names.join(", ")
    if (!text.trim()) {
      setError("Selecione ao menos um prato do cardápio.")
      return
    }
    setParsing(true)
    setError(null)
    setParseResult(null)
    setSaved(false)
    try {
      const data = await callEdgeFunction<TextLogResult>("ai-parse-text", {
        text,
        bias,
        restaurant: restaurantNameForParse,
      })
      setParseResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setParsing(false)
    }
  }, [menuLines, selectedLineIds, bias, restaurantNameForParse])

  const saveMeal = useCallback(async () => {
    if (!parseResult) return
    setSaving(true)
    try {
      const res = await fetch("/api/meals/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parseResult.items, totals: parseResult.totals }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Falha ao salvar")
      }
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar refeição")
    } finally {
      setSaving(false)
    }
  }, [parseResult])

  const resetFlow = () => {
    setMenuImage(null)
    setMenuLines([])
    setScanMeta(null)
    setSelectedLineIds(new Set())
    setParseResult(null)
    setSaved(false)
    setError(null)
  }

  return (
    <div className="space-y-4">
      {/* Location */}
      <div className="rounded-2xl bg-white ring-1 ring-black/[0.04] p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1a3a2a]/8 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-4 w-4 text-[#1a3a2a]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#1a3a2a]">Restaurantes perto de você</p>
            <p className="text-xs text-[#1a3a2a]/50 mt-0.5 leading-relaxed">
              Precisamos da sua localização para listar opções próximas e ajustar porções no cálculo.
            </p>
          </div>
        </div>

        {geoPhase === "need_permission" && (
          <Button
            type="button"
            className="w-full rounded-xl bg-[#1a3a2a] text-white font-semibold"
            onClick={requestLocation}
          >
            Permitir localização
          </Button>
        )}

        {geoPhase === "loading" && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-[#1a3a2a]/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            Obtendo localização…
          </div>
        )}

        {geoPhase === "places_error" && placesError && (
          <div className="rounded-xl bg-[#c4614a]/8 border border-[#c4614a]/20 p-3 text-sm text-[#c4614a]">
            {placesError}
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg border-[#1a3a2a]/20"
                onClick={() => {
                  setGeoPhase("need_permission")
                  setPlacesError(null)
                }}
              >
                Tentar de novo
              </Button>
            </div>
          </div>
        )}

        {geoPhase === "ready" && userLatLng && (
          <div className="space-y-2">
            {placesError && !places.length && (
              <p className="text-xs text-[#1a3a2a]/45">{placesError}</p>
            )}
            {places.length > 0 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1a3a2a]/60">
                  Onde você está? (opcional)
                </p>
                <ScrollArea className="h-[min(220px,40vh)] rounded-xl border border-[#e4ddd4] bg-[#faf8f4]/50 p-1">
                  <div className="space-y-1 p-1">
                    <button
                      type="button"
                      onClick={() => setSelectedPlace("none")}
                      className={cn(
                        "w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors",
                        selectedPlace === "none"
                          ? "bg-[#1a3a2a] text-white"
                          : "hover:bg-white text-[#1a3a2a]/80"
                      )}
                    >
                      Não listado
                    </button>
                    {places.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlace(p)}
                        className={cn(
                          "w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors",
                          selectedPlace !== "none" && selectedPlace?.id === p.id
                            ? "bg-[#1a3a2a] text-white"
                            : "hover:bg-white text-[#1a3a2a]/80"
                        )}
                      >
                        <span className="font-medium block truncate">{p.name}</span>
                        {p.vicinity && (
                          <span
                            className={cn(
                              "text-xs block truncate mt-0.5",
                              selectedPlace !== "none" && selectedPlace?.id === p.id
                                ? "text-white/80"
                                : "text-[#1a3a2a]/45"
                            )}
                          >
                            {p.vicinity}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        )}
      </div>

      {/* Scan menu */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-[#1a3a2a]/50" />
          <p className="text-sm font-semibold text-[#1a3a2a]">Escanear cardápio</p>
        </div>

        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border-2 border-dashed transition-all cursor-pointer",
            menuImage ? "border-[#1a3a2a]/20" : "border-[#e4ddd4] hover:border-[#1a3a2a]/25"
          )}
          onClick={() => !menuImage && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
          {menuImage ? (
            <div className="relative aspect-[4/3] w-full">
              <Image src={menuImage} alt="Cardápio" fill className="object-cover rounded-3xl" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-3xl" />
              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-xl bg-white/90 text-[#1a3a2a] font-semibold"
                  onClick={(e) => {
                    e.stopPropagation()
                    resetFlow()
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Outra foto
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 rounded-xl bg-[#1a3a2a] text-white font-semibold"
                  onClick={(e) => {
                    e.stopPropagation()
                    void runScan()
                  }}
                  disabled={scanning}
                >
                  {scanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Lendo cardápio…
                    </>
                  ) : (
                    "Ler cardápio"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-12 px-6 text-center">
              <p className="text-sm text-[#1a3a2a]/60">Toque para tirar uma foto ou enviar a imagem do menu</p>
            </div>
          )}
        </div>

        {scanMeta?.unreadable && scanMeta.rawNotes && (
          <p className="text-xs text-[#c4614a]">{scanMeta.rawNotes}</p>
        )}
      </div>

      {menuLines.length > 0 && (
        <div className="space-y-3 rounded-2xl bg-white ring-1 ring-black/[0.04] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1a3a2a]/60">
              Escolha os pratos
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={selectAll}>
                Todos
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={clearSelection}>
                Limpar
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-[min(320px,50vh)] overflow-y-auto pr-1">
            {menuLines.map((line) => (
              <label
                key={line.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-[#e4ddd4] p-3 cursor-pointer transition-colors",
                  selectedLineIds.has(line.id) ? "bg-[#1a3a2a]/5 border-[#1a3a2a]/25" : "bg-[#faf8f4]/80"
                )}
              >
                <Checkbox
                  checked={selectedLineIds.has(line.id)}
                  onCheckedChange={() => toggleLine(line.id)}
                  className="mt-0.5 border-[#1a3a2a]/30 data-[state=checked]:bg-[#1a3a2a] data-[state=checked]:border-[#1a3a2a]"
                />
                <div className="min-w-0 flex-1">
                  {line.section && (
                    <p className="text-[10px] font-semibold uppercase text-[#1a3a2a]/60 mb-0.5">{line.section}</p>
                  )}
                  <p className="text-sm font-medium text-[#1a3a2a] leading-snug">{line.name}</p>
                  {line.priceText && (
                    <p className="text-xs text-[#1a3a2a]/45 mt-0.5">{line.priceText}</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1a3a2a]/60">
              Estimativa de calorias
            </p>
            <BiasRow value={bias} onChange={setBias} />
          </div>

          <Button
            type="button"
            className="w-full rounded-xl bg-[#1a3a2a] text-white font-semibold"
            onClick={runParse}
            disabled={parsing}
          >
            {parsing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Analisando…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Estimar nutrição
              </>
            )}
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-[#c4614a]/8 border border-[#c4614a]/20 p-4 text-sm text-[#c4614a]">
          {error}
        </div>
      )}

      {parsing && (
        <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] p-10 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-[#1a3a2a] animate-spin" />
          <p className="font-serif text-lg italic text-[#1a3a2a] text-center">Calculando nutrientes…</p>
        </div>
      )}

      {parseResult && !parsing && (
        <div className="space-y-4 page-enter">
          <MenuTotalsBar totals={parseResult.totals} />
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1a3a2a]/60">
              {parseResult.items.length} {parseResult.items.length === 1 ? "alimento" : "alimentos"}
            </p>
            {parseResult.items.map((item) => (
              <MenuItemChip
                key={item.id}
                item={item}
                onTap={setSelectedParsed}
                onRemove={removeParsedItem}
              />
            ))}
          </div>
          <Button
            className="w-full rounded-2xl bg-[#1a3a2a] text-white py-6 font-semibold text-sm"
            onClick={saveMeal}
            disabled={saving || saved}
          >
            {saved ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Refeição salva!
              </>
            ) : saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando…
              </>
            ) : (
              "Salvar refeição"
            )}
          </Button>
        </div>
      )}

      <ReasoningDialog item={selectedParsed} onClose={() => setSelectedParsed(null)} />
    </div>
  )
}

export default RestaurantMenuTab
