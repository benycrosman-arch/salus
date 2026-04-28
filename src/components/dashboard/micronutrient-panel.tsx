"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Loader2, Beaker, ChevronDown, ChevronUp } from "lucide-react"
import { MICRONUTRIENTS, microPercent, microStatus, MICRO_BY_KEY } from "@/lib/micronutrients"

type Totals = Record<string, number>

export function MicronutrientPanel() {
  const [totals, setTotals] = useState<Totals>({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch("/api/user/micronutrients")
      .then((r) => r.json())
      .then((data) => setTotals(data.totals ?? {}))
      .catch(() => setTotals({}))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="border-0 shadow-md p-5 flex items-center justify-center min-h-[100px]">
        <Loader2 className="w-5 h-5 animate-spin text-[#1a3a2a]/40" />
      </Card>
    )
  }

  const tracked = MICRONUTRIENTS.filter((m) => totals[m.key] != null && totals[m.key]! > 0)
  if (tracked.length === 0) {
    return (
      <Card className="border-0 shadow-md p-5">
        <div className="flex items-center gap-2 mb-2">
          <Beaker className="w-4 h-4 text-[#1a3a2a]/60" />
          <h2 className="text-sm font-semibold text-foreground">Vitaminas e minerais</h2>
        </div>
        <p className="text-xs text-muted-foreground font-body">
          Registre uma refeição com a câmera ou texto pra ver os micronutrientes do dia.
        </p>
      </Card>
    )
  }

  const visible = expanded ? tracked : tracked.slice(0, 6)

  return (
    <Card className="border-0 shadow-md p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Beaker className="w-4 h-4 text-[#1a3a2a]/60" />
        <h2 className="text-sm font-semibold text-foreground">Vitaminas e minerais hoje</h2>
        <span className="text-[11px] text-muted-foreground ml-auto font-body">
          {tracked.length} de {MICRONUTRIENTS.length}
        </span>
      </div>

      <div className="space-y-2.5">
        {visible.map((m) => {
          const value = totals[m.key]!
          const pct = microPercent(m.key, value)
          const status = microStatus(m.key, value)
          const def = MICRO_BY_KEY[m.key]
          const fillColor =
            status === "over"
              ? "bg-red-500"
              : status === "high"
                ? "bg-amber-500"
                : status === "ok"
                  ? "bg-green-600"
                  : "bg-[#1a3a2a]/30"
          return (
            <div key={m.key}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-medium text-foreground">{m.label}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground font-body">
                  {value.toFixed(value < 10 ? 1 : 0)} {m.unit}
                  <span className="ml-1.5 text-[10px] text-muted-foreground/70">
                    / {def.rda} {m.unit}
                  </span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#e4ddd4] overflow-hidden">
                <div
                  className={`h-full ${fillColor} transition-all duration-500`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {tracked.length > 6 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 pt-1 text-xs text-[#1a3a2a]/60 hover:text-[#1a3a2a] transition-colors"
        >
          {expanded ? "Mostrar menos" : `Ver todos (${tracked.length - 6} mais)`}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      )}
    </Card>
  )
}
