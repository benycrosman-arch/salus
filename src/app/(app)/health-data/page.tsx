"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertCircle, FlaskConical, HelpCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  PdfExamUpload,
  type ParsedPdfResult,
  type ExtraLab,
  type KnownLabKey,
} from "@/app/onboarding/pdf-exam-upload"

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

export default function HealthDataPage() {
  const supabase = createClient()
  const [labValues, setLabValues] = useState<LabValues>({})
  const [extraLabs, setExtraLabs] = useState<ExtraLab[]>([])
  const [labUploadId, setLabUploadId] = useState<string | null>(null)
  const [labMeasuredAt, setLabMeasuredAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      setUserId(data.user?.id ?? null)
    })
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
  }

  const handleResetUpload = () => {
    setLabUploadId(null)
    setLabMeasuredAt(null)
    setExtraLabs([])
  }

  const handleSaveLabs = async () => {
    if (!userId) {
      toast.error("Faça login novamente para salvar.")
      return
    }
    const today = new Date().toISOString().split("T")[0]
    const measuredAt = labMeasuredAt && /^\d{4}-\d{2}-\d{2}$/.test(labMeasuredAt) ? labMeasuredAt : today
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

    toast.success(`${rows.length} marcador${rows.length > 1 ? "es" : ""} salvo${rows.length > 1 ? "s" : ""}.`)
    setLabValues({})
    handleResetUpload()
  }

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-sans">Exames</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Suba o PDF do laboratório ou registre os valores manualmente. Tudo fica privado e visível só pra você (e seu nutricionista, se vinculado).
        </p>
      </div>

      <PdfExamUpload onParsed={handleParsed} onReset={handleResetUpload} />

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
              <p className="text-[11px] text-muted-foreground font-body mt-0.5">Ref: {marker.ref} {marker.unit}</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="—"
                value={labValues[marker.key] ?? ""}
                onChange={(e) => setLabValues({ ...labValues, [marker.key]: e.target.value })}
                className="w-24 h-9 text-sm text-center rounded-xl font-body"
              />
              <span className="text-xs text-muted-foreground font-body w-10">{marker.unit}</span>
            </div>
          </Card>
        ))}
      </div>

      {extraLabs.length > 0 && (
        <Card className="border-0 shadow-sm p-4 bg-primary/5 space-y-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">+{extraLabs.length} marcadores extras do PDF</p>
          </div>
          <p className="text-xs text-muted-foreground font-body">
            {extraLabs.slice(0, 6).map((e) => e.marker).join(" · ")}
            {extraLabs.length > 6 && ` · +${extraLabs.length - 6}`}
          </p>
          <p className="text-xs text-muted-foreground font-body">Serão salvos junto quando você confirmar.</p>
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

      <Card className="border-0 shadow-sm p-4 bg-muted/50 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-info mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground font-body leading-relaxed">
          Seus dados de saúde são privados e criptografados. Usamos apenas para personalizar seus scores e recomendações nutricionais.
        </p>
      </Card>
    </div>
  )
}
