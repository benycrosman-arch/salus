"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Target } from "lucide-react"

type Goals = {
  calories_target: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  notes: string | null
  updated_at: string | null
}

/**
 * Read-only display of the nutri-set macro targets for this patient.
 *
 * Renders nothing when the patient isn't linked to a nutri OR the nutri
 * hasn't set targets yet — keeps the dashboard clean for self-service users.
 *
 * Client-fetched (not SSR) so the realtime refresher's router.refresh()
 * doesn't have to re-fetch this every time; it has its own subscription
 * via the parent PatientRealtimeRefresher → server data refetch path.
 * For the v1 we just fetch on mount; if you want sub-second updates after
 * the nutri saves, the parent's router.refresh() will re-render this
 * component which re-fetches anyway.
 */
export function NutriTargetsCard() {
  const [goals, setGoals] = useState<Goals | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/patient/goals")
      .then((r) => r.json().catch(() => ({})))
      .then((body) => {
        if (cancelled) return
        setGoals((body?.goals as Goals | null) ?? null)
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded || !goals) return null

  const fields = [
    { label: "Calorias", unit: "kcal", value: goals.calories_target },
    { label: "Proteína", unit: "g", value: goals.protein_g },
    { label: "Carbo", unit: "g", value: goals.carbs_g },
    { label: "Gordura", unit: "g", value: goals.fat_g },
  ]
  const hasAnyValue = fields.some((f) => f.value != null)
  if (!hasAnyValue && !goals.notes) return null

  return (
    <Card className="border-0 shadow-md p-5 bg-gradient-to-br from-[#1a3a2a]/[0.04] to-transparent ring-1 ring-[#1a3a2a]/10">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-[#1a3a2a]" />
        <h2 className="text-sm font-semibold text-[#1a3a2a]">Metas do seu nutricionista</h2>
      </div>
      {hasAnyValue && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {fields.map((f) => (
            <div key={f.label} className="rounded-xl bg-white ring-1 ring-black/[0.04] p-3 text-center">
              <p className="text-[10px] text-[#1a3a2a]/55 uppercase tracking-wide font-semibold">
                {f.label}
              </p>
              <p className="text-xl font-semibold text-[#1a3a2a] mt-1">
                {f.value != null ? `${f.value}` : "—"}
              </p>
              {f.value != null && (
                <p className="text-[10px] text-[#1a3a2a]/50">{f.unit}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {goals.notes && (
        <div className="mt-3 rounded-xl bg-white ring-1 ring-black/[0.04] p-3">
          <p className="text-[10px] text-[#1a3a2a]/55 uppercase tracking-wide font-semibold mb-1">
            Observação
          </p>
          <p className="text-sm text-[#1a3a2a] whitespace-pre-wrap">{goals.notes}</p>
        </div>
      )}
      {goals.updated_at && (
        <p className="text-[10px] text-[#1a3a2a]/40 mt-3 text-right">
          Atualizado em {new Date(goals.updated_at).toLocaleString("pt-BR")}
        </p>
      )}
    </Card>
  )
}
