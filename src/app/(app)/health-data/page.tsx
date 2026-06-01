"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertCircle,
  FlaskConical,
  HelpCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Utensils,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  PdfExamUpload,
  type ParsedPdfResult,
  type ExtraLab,
  type KnownLabKey,
  type LabStatus,
  type InterpretedMarkerView,
} from "@/app/onboarding/pdf-exam-upload"
import { getDietTranslations, type DietRecommendation } from "@/lib/labs/diet-translation"
import { interpretLabs, type RawMarker } from "@/lib/labs/interpret"
import type { Sex } from "@/lib/labs/reference-ranges"

interface LabMarker {
  key: KnownLabKey
  label: string
  unit: string
  ref: string
  tooltip: string
}

const labMarkers: LabMarker[] = [
  { key: "glucose", label: "Glicose em jejum", unit: "mg/dL", ref: "70–99", tooltip: "Mede o açúcar no sangue em jejum" },
  { key: "hba1c", label: "HbA1c", unit: "%", ref: "<5.7", tooltip: "Média do açúcar nos últimos 2-3 meses" },
  { key: "hdl", label: "HDL (colesterol bom)", unit: "mg/dL", ref: ">60", tooltip: "Colesterol bom — protetor cardiovascular" },
  { key: "ldl", label: "LDL (colesterol ruim)", unit: "mg/dL", ref: "<100", tooltip: "Colesterol ruim" },
  { key: "triglycerides", label: "Triglicérides", unit: "mg/dL", ref: "<150", tooltip: "Gorduras circulantes no sangue" },
  { key: "vitaminD", label: "Vitamina D", unit: "ng/mL", ref: "30–100", tooltip: "Fundamental para ossos, imunidade e humor" },
  { key: "ferritin", label: "Ferritina", unit: "ng/mL", ref: "12–300", tooltip: "Reserva de ferro no organismo" },
  { key: "b12", label: "Vitamina B12", unit: "pg/mL", ref: "200–900", tooltip: "Essencial para nervos e produção de glóbulos vermelhos" },
]

type LabValues = Partial<Record<KnownLabKey, string>>

interface ExamInterpretation {
  markers: InterpretedMarkerView[]
  flags: string[]
  rollup: {
    optimal: number
    borderline: number
    out_of_range: number
    critical: number
    total: number
  }
  measuredAt: string | null
  source: "parsed" | "saved"
}

const STATUS_CONFIG: Record<
  LabStatus,
  { label: string; bg: string; text: string; icon: typeof TrendingUp }
> = {
  optimal: { label: "Ótimo", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", icon: Minus },
  borderline_low: { label: "Limítrofe baixo", bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", icon: TrendingDown },
  borderline_high: { label: "Limítrofe alto", bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", icon: TrendingUp },
  low: { label: "Baixo", bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-400", icon: TrendingDown },
  high: { label: "Elevado", bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-400", icon: TrendingUp },
  critical_low: { label: "Crítico baixo", bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-400", icon: TrendingDown },
  critical_high: { label: "Crítico alto", bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-400", icon: TrendingUp },
}

const PRIORITY_CONFIG = {
  critical: { bar: "bg-rose-500", label: "Atenção urgente" },
  high: { bar: "bg-orange-400", label: "Prioridade alta" },
  medium: { bar: "bg-sky-400", label: "Oportunidade" },
}

function MarkerRow({ m }: { m: InterpretedMarkerView }) {
  const cfg = m.status ? STATUS_CONFIG[m.status] : null
  const Icon = cfg?.icon ?? Minus
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/60 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">
          {m.label ?? m.rawMarker}
        </p>
        {m.message && (
          <p className="text-xs text-muted-foreground font-body mt-0.5 leading-snug">{m.message}</p>
        )}
        {m.source && (
          <p className="text-[10px] text-muted-foreground/60 font-body mt-0.5">{m.source}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-semibold tabular-nums">
          {m.value} <span className="text-xs font-normal text-muted-foreground">{m.unit}</span>
        </span>
        {cfg ? (
          <span className={`inline-flex items-center gap-1 text-xs font-body px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
        ) : (
          <span className="inline-flex items-center text-xs font-body px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Sem referência
          </span>
        )}
      </div>
    </div>
  )
}

function DietCard({ rec }: { rec: DietRecommendation }) {
  const [open, setOpen] = useState(rec.priority === "critical")
  const pcfg = PRIORITY_CONFIG[rec.priority]

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className={`h-1 ${pcfg.bar}`} />
      <div className="p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-start gap-3 text-left"
        >
          <Utensils className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{rec.title}</p>
              <span className={`text-[10px] font-body px-1.5 py-0.5 rounded-full ${pcfg.bar} text-white`}>
                {pcfg.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-body mt-0.5 leading-snug">{rec.context}</p>
          </div>
          {open ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          )}
        </button>

        {open && (
          <div className="mt-4 space-y-4">
            {rec.increase.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-2">
                  Aumentar / priorizar
                </p>
                <div className="space-y-1.5">
                  {rec.increase.map((item) => (
                    <div key={item.food} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-foreground">{item.food}</span>
                        <span className="text-xs text-muted-foreground font-body"> — {item.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rec.reduce.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-2">
                  Reduzir / evitar
                </p>
                <div className="space-y-1.5">
                  {rec.reduce.map((item) => (
                    <div key={item.food} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-foreground">{item.food}</span>
                        <span className="text-xs text-muted-foreground font-body"> — {item.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rec.tip && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs font-body text-foreground leading-relaxed">
                  <span className="font-semibold">Dica prática: </span>
                  {rec.tip}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

function ExamResultsSection({ interpretation }: { interpretation: ExamInterpretation }) {
  const { markers, flags, rollup, measuredAt, source } = interpretation
  const [showAll, setShowAll] = useState(false)
  const dietRecs = getDietTranslations(flags)
  const outOfRange = markers.filter((m) => m.outOfRange)
  const optimal = markers.filter((m) => m.status === "optimal")
  const unknown = markers.filter((m) => !m.status)

  const displayed = showAll ? markers : markers.slice(0, 8)

  const formattedDate = measuredAt
    ? (() => {
        const [y, mo, d] = measuredAt.split("-")
        return y && mo && d ? `${d}/${mo}/${y}` : null
      })()
    : null

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="flex items-center gap-2">
        {source === "saved" && <History className="w-4 h-4 text-muted-foreground" />}
        <div>
          <p className="text-sm font-semibold text-foreground">
            {source === "saved" ? "Último exame salvo" : "Resultado do exame"}
            {formattedDate ? ` · coleta ${formattedDate}` : ""}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {rollup.optimal > 0 && (
              <span className="text-xs font-body px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                {rollup.optimal} ótimo{rollup.optimal !== 1 ? "s" : ""}
              </span>
            )}
            {rollup.borderline > 0 && (
              <span className="text-xs font-body px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {rollup.borderline} limítrofe{rollup.borderline !== 1 ? "s" : ""}
              </span>
            )}
            {rollup.out_of_range > 0 && (
              <span className="text-xs font-body px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-400">
                {rollup.out_of_range} fora da faixa
              </span>
            )}
            {rollup.critical > 0 && (
              <span className="text-xs font-body px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400">
                {rollup.critical} crítico{rollup.critical !== 1 ? "s" : ""}
              </span>
            )}
            {unknown.length > 0 && (
              <span className="text-xs font-body px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {unknown.length} sem referência
              </span>
            )}
          </div>
        </div>
      </div>

      {/* All markers */}
      <Card className="border-0 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">
            Todos os marcadores ({rollup.total})
          </p>
        </div>
        <div>
          {displayed.map((m) => (
            <MarkerRow key={`${m.rawMarker}-${m.value}`} m={m} />
          ))}
        </div>
        {markers.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-3 text-xs text-primary font-body hover:underline flex items-center gap-1"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Ver todos os {markers.length} marcadores
              </>
            )}
          </button>
        )}
      </Card>

      {/* Diet translation */}
      {dietRecs.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">
              Como isso se traduz na sua alimentação
            </p>
          </div>
          <p className="text-xs text-muted-foreground font-body">
            {outOfRange.length} marcador{outOfRange.length !== 1 ? "es" : ""} fora do ideal — cada card mostra o que priorizar e o que reduzir.
          </p>
          <div className="space-y-3">
            {dietRecs.map((rec) => (
              <DietCard key={rec.flag} rec={rec} />
            ))}
          </div>
        </div>
      ) : optimal.length > 0 ? (
        <Card className="border-0 shadow-sm p-4 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <Utensils className="w-4 h-4 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Exame dentro da faixa ideal!
              </p>
              <p className="text-xs text-muted-foreground font-body mt-0.5">
                Nenhum marcador reconhecido precisou de ajuste dietético. Mantenha o padrão atual.
              </p>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

export default function HealthDataPage() {
  const supabase = createClient()
  const [labValues, setLabValues] = useState<LabValues>({})
  const [extraLabs, setExtraLabs] = useState<ExtraLab[]>([])
  const [labUploadId, setLabUploadId] = useState<string | null>(null)
  const [labMeasuredAt, setLabMeasuredAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [parsedInterpretation, setParsedInterpretation] = useState<ExamInterpretation | null>(null)
  const [savedInterpretation, setSavedInterpretation] = useState<ExamInterpretation | null>(null)
  const [loadingSaved, setLoadingSaved] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) { setLoadingSaved(false); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from("profiles")
        .select("biological_sex, age")
        .eq("id", user.id)
        .maybeSingle()

      const profileSex: Sex =
        profile?.biological_sex === "male" ? "M" : profile?.biological_sex === "female" ? "F" : "any"
      const profileAge: number = typeof profile?.age === "number" ? profile.age : 30

      // Load latest exam batch from DB
      const { data: results } = await supabase
        .from("lab_results")
        .select("marker, value, unit, reference_min, reference_max, measured_at, upload_id")
        .eq("user_id", user.id)
        .order("measured_at", { ascending: false })
        .limit(60)

      if (cancelled) return

      if (results && results.length > 0) {
        // Group by the latest upload_id (or measured_at if no upload_id)
        const latestUploadId = results[0].upload_id
        const batch = latestUploadId
          ? results.filter((r) => r.upload_id === latestUploadId)
          : results.filter((r) => r.measured_at === results[0].measured_at)

        const rawMarkers: RawMarker[] = batch.map((r) => ({
          marker: r.marker,
          value: r.value,
          unit: r.unit || "",
          reference_min: r.reference_min,
          reference_max: r.reference_max,
        }))

        const interpreted = interpretLabs(rawMarkers, profileSex, profileAge)
        setSavedInterpretation({
          markers: interpreted.markers as unknown as InterpretedMarkerView[],
          flags: interpreted.flags,
          rollup: interpreted.rollup,
          measuredAt: batch[0]?.measured_at ?? null,
          source: "saved",
        })
      }

      setLoadingSaved(false)
    }
    init()
    return () => { cancelled = true }
  }, [supabase])

  const handleParsed = (result: ParsedPdfResult) => {
    setLabUploadId(result.uploadId)
    setLabMeasuredAt(result.measuredAt)
    setExtraLabs(result.extraLabs)
    setLabValues((prev) => {
      const next = { ...prev }
      for (const m of labMarkers) {
        const v = result.knownLabs[m.key]
        if (v !== null && v !== undefined) next[m.key] = String(v)
      }
      return next
    })
    if (result.interpretation) {
      setParsedInterpretation({
        markers: result.interpretation.markers,
        flags: result.interpretation.flags,
        rollup: result.interpretation.rollup,
        measuredAt: result.measuredAt,
        source: "parsed",
      })
    }
  }

  const handleResetUpload = () => {
    setLabUploadId(null)
    setLabMeasuredAt(null)
    setExtraLabs([])
    setParsedInterpretation(null)
  }

  const handleSaveLabs = async () => {
    if (!userId) {
      toast.error("Faça login novamente para salvar.")
      return
    }
    const today = new Date().toISOString().split("T")[0]
    const measuredAt =
      labMeasuredAt && /^\d{4}-\d{2}-\d{2}$/.test(labMeasuredAt) ? labMeasuredAt : today
    const source = labUploadId ? "pdf_upload" : "manual"

    const rows: Array<Record<string, unknown>> = []
    for (const m of labMarkers) {
      const raw = labValues[m.key]
      if (raw === undefined || raw === "") continue
      const value = Number.parseFloat(raw.replace(",", "."))
      if (!Number.isFinite(value)) continue
      rows.push({
        user_id: userId,
        marker: m.label,
        value,
        unit: m.unit,
        measured_at: measuredAt,
        source,
        upload_id: labUploadId,
      })
    }

    for (const e of extraLabs) {
      rows.push({
        user_id: userId,
        marker: e.marker,
        value: e.value,
        unit: e.unit,
        reference_min: e.reference_min,
        reference_max: e.reference_max,
        measured_at: measuredAt,
        source: "pdf_upload",
        upload_id: labUploadId,
      })
    }

    if (rows.length === 0) {
      toast.error("Nenhum valor para salvar.")
      return
    }

    setSaving(true)
    const { error } = await supabase.from("lab_results").insert(rows)
    setSaving(false)

    if (error) {
      toast.error(error.message || "Não foi possível salvar os exames.")
      return
    }

    toast.success(
      `${rows.length} marcador${rows.length > 1 ? "es" : ""} salvo${rows.length > 1 ? "s" : ""}.`,
    )

    // After saving, promote parsed interpretation to saved
    if (parsedInterpretation) {
      setSavedInterpretation({ ...parsedInterpretation, source: "saved" })
    }

    setLabValues({})
    handleResetUpload()
  }

  const activeInterpretation = parsedInterpretation ?? savedInterpretation

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-sans">Exames</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Suba o PDF do laboratório ou registre os valores manualmente. A IA interpreta os marcadores
          e mostra o impacto direto na sua alimentação.
        </p>
      </div>

      <PdfExamUpload onParsed={handleParsed} onReset={handleResetUpload} />

      {/* Results: all markers + diet translation */}
      {loadingSaved ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-body">Carregando exames anteriores…</span>
        </div>
      ) : activeInterpretation ? (
        <ExamResultsSection interpretation={activeInterpretation} />
      ) : null}

      {/* Manual entry form — always visible when we have a parsed result or no saved exams */}
      {(parsedInterpretation || !savedInterpretation) && (
        <>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Marcadores principais</p>
            <p className="text-xs text-muted-foreground font-body">
              Valores lidos do PDF acima — revise e corrija se necessário antes de salvar.
            </p>
          </div>

          <div className="space-y-3">
            {labMarkers.map((marker) => (
              <Card key={marker.key} className="border-0 shadow-sm p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate">{marker.label}</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm max-w-xs font-body">{marker.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-body mt-0.5">
                    Ref: {marker.ref} {marker.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="—"
                    value={labValues[marker.key] ?? ""}
                    onChange={(e) =>
                      setLabValues({ ...labValues, [marker.key]: e.target.value })
                    }
                    className="w-24 h-9 text-sm text-center rounded-xl font-body"
                  />
                  <span className="text-xs text-muted-foreground font-body w-10">
                    {marker.unit}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {extraLabs.length > 0 && (
            <Card className="border-0 shadow-sm p-4 bg-primary/5 space-y-2">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  +{extraLabs.length} marcadores extras do PDF
                </p>
              </div>
              <p className="text-xs text-muted-foreground font-body">
                {extraLabs
                  .slice(0, 6)
                  .map((e) => e.marker)
                  .join(" · ")}
                {extraLabs.length > 6 && ` · +${extraLabs.length - 6}`}
              </p>
              <p className="text-xs text-muted-foreground font-body">
                Serão salvos junto quando você confirmar.
              </p>
            </Card>
          )}

          <Button
            onClick={handleSaveLabs}
            disabled={saving}
            className="w-full h-12 rounded-xl bg-primary font-semibold hover:bg-primary-hover transition-all gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Salvar exames
          </Button>
        </>
      )}

      <Card className="border-0 shadow-sm p-4 bg-muted/50 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-info mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground font-body leading-relaxed">
          Seus dados de saúde são privados e criptografados. Usados apenas para personalizar
          suas recomendações nutricionais — nunca compartilhados sem sua permissão.
        </p>
      </Card>
    </div>
  )
}
