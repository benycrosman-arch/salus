"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, Save, History, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface Recommendation {
  id: string
  body: string
  is_active: boolean
  created_at: string
}

interface Props {
  patientId: string
  initialRecommendations: Recommendation[]
}

const MIN = 20
const MAX = 4000

export function RecommendationsEditor({ patientId, initialRecommendations }: Props) {
  const [history, setHistory] = useState<Recommendation[]>(initialRecommendations)
  const active = history.find((r) => r.is_active) ?? null
  const [draft, setDraft] = useState<string>(active?.body ?? "")
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const len = draft.trim().length
  const tooShort = len > 0 && len < MIN
  const tooLong = len > MAX
  const unchanged = active && draft.trim() === active.body.trim()
  const canSave = !saving && !tooShort && !tooLong && len >= MIN && !unchanged

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const res = await fetch("/api/nutri/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, body: draft.trim() }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof payload?.error === "string" ? payload.error : "Erro ao salvar.")
        return
      }
      const newRec = payload.recommendation as Recommendation
      setHistory((prev) => [
        newRec,
        ...prev.map((r) => ({ ...r, is_active: false })),
      ])
      toast.success("Orientação atualizada. O paciente verá no próximo acesso.")
    } catch {
      toast.error("Erro de rede.")
    } finally {
      setSaving(false)
    }
  }

  const prior = history.filter((r) => !r.is_active)

  return (
    <Card className="border-0 shadow-md p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#1a3a2a] flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Orientações para o paciente
        </h2>
        {prior.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] text-[#1a3a2a]/60 hover:text-[#1a3a2a]"
          >
            <History className="w-3 h-3" />
            {showHistory ? "Esconder histórico" : `Histórico (${prior.length})`}
          </button>
        )}
      </div>

      <p className="text-xs text-[#1a3a2a]/60 font-body mb-3 leading-relaxed">
        Esta orientação será injetada no contexto da IA do paciente — na análise das refeições, no
        coach do WhatsApp e como card no dashboard dele. Use linguagem direta e prática.
      </p>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={
          "Ex.: Reduzir ultraprocessados nas próximas 2 semanas. Priorizar 30g de proteína por refeição. Café da manhã com ovos ou iogurte natural. Hidratar 2L/dia. Evitar refrigerante."
        }
        rows={8}
        className="w-full rounded-xl border border-[#e4ddd4] bg-white px-3.5 py-2.5 text-sm text-[#1a3a2a] placeholder:text-[#1a3a2a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/20 font-body"
        disabled={saving}
      />
      <div className="flex items-center justify-between mt-2">
        <div className="text-[11px] text-[#1a3a2a]/40 font-body">
          {len}/{MAX} caracteres
          {tooShort && <span className="text-[#c4614a] ml-2">mínimo {MIN}</span>}
          {tooLong && <span className="text-[#c4614a] ml-2">acima do limite</span>}
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          size="sm"
          className="rounded-xl gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {active ? "Salvar nova versão" : "Salvar orientação"}
        </Button>
      </div>

      {active && (
        <p className="text-[11px] text-[#1a3a2a]/40 font-body mt-3">
          Versão ativa desde {new Date(active.created_at).toLocaleString("pt-BR")}
        </p>
      )}

      {showHistory && prior.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[#e4ddd4] space-y-3">
          {prior.map((r) => (
            <div key={r.id} className="text-xs font-body">
              <div className="text-[11px] text-[#1a3a2a]/40 mb-1">
                {new Date(r.created_at).toLocaleString("pt-BR")}
              </div>
              <p className="text-[#1a3a2a]/70 whitespace-pre-wrap leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
