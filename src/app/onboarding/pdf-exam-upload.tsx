"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, FileCheck2, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

export type KnownLabKey =
  | "glucose"
  | "hba1c"
  | "hdl"
  | "ldl"
  | "triglycerides"
  | "vitaminD"
  | "ferritin"
  | "b12"

export interface ExtraLab {
  marker: string
  value: number
  unit: string
  reference_min: number | null
  reference_max: number | null
}

export interface ParsedPdfResult {
  uploadId: string
  measuredAt: string | null
  knownLabs: Record<KnownLabKey, number | null>
  extraLabs: ExtraLab[]
  confidence: "high" | "medium" | "low"
  notes: string
}

type State =
  | { kind: "idle" }
  | { kind: "uploading"; filename: string }
  | { kind: "done"; filename: string; result: ParsedPdfResult }
  | { kind: "error"; message: string }

interface Props {
  onParsed: (result: ParsedPdfResult) => void
  onReset: () => void
}

const MAX_BYTES = 10 * 1024 * 1024

function formatMeasuredAt(iso: string | null): string | null {
  if (!iso) return null
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return null
  return `${d}/${m}/${y}`
}

export function PdfExamUpload({ onParsed, onReset }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" })
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Apenas PDF.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error("PDF muito grande (máx 10MB).")
      return
    }
    setState({ kind: "uploading", filename: file.name })
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/labs/parse-pdf", { method: "POST", body: fd })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          typeof payload?.error === "string" && payload.error !== "extraction_failed"
            ? payload.error
            : "Não consegui ler o PDF. Tente outro ou preencha manual."
        setState({ kind: "error", message: msg })
        return
      }
      const result = payload as ParsedPdfResult
      setState({ kind: "done", filename: file.name, result })
      onParsed(result)
      const knownCount = Object.values(result.knownLabs).filter((v) => v !== null).length
      const extraCount = result.extraLabs.length
      toast.success(
        extraCount > 0
          ? `Lemos ${knownCount} dos 8 marcadores + ${extraCount} extras.`
          : `Lemos ${knownCount} dos 8 marcadores.`,
      )
    } catch {
      setState({ kind: "error", message: "Erro de rede ao enviar o PDF." })
    }
  }

  function handleReset() {
    setState({ kind: "idle" })
    if (inputRef.current) inputRef.current.value = ""
    onReset()
  }

  if (state.kind === "uploading") {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-5">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Lendo seu exame com Claude Opus 4.7…</p>
            <p className="text-xs text-muted-foreground font-body truncate">{state.filename}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-body mt-3">
          Pode levar 10-25s para laudos longos.
        </p>
      </div>
    )
  }

  if (state.kind === "done") {
    const { result } = state
    const knownCount = Object.values(result.knownLabs).filter((v) => v !== null).length
    const measured = formatMeasuredAt(result.measuredAt)
    return (
      <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <FileCheck2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">PDF interpretado.</p>
            <p className="text-xs text-muted-foreground font-body truncate">{state.filename}</p>
            <p className="text-xs font-body mt-1.5">
              {knownCount}/8 marcadores principais{measured ? ` · coleta ${measured}` : ""}
              {result.extraLabs.length > 0 ? ` · +${result.extraLabs.length} extras` : ""}
            </p>
            <p className="text-xs text-muted-foreground font-body mt-1">
              Revise os campos abaixo e ajuste se algum valor saiu errado.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Trocar
          </Button>
        </div>
      </div>
    )
  }

  if (state.kind === "error") {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{state.message}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="mt-2 text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tentar de novo
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <label
      htmlFor="pdf-exam-input"
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) void handleFile(file)
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer p-6 transition-colors ${
        dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/60 hover:bg-muted/30"
      }`}
    >
      <Upload className="w-6 h-6 text-primary" />
      <div className="text-center">
        <p className="text-sm font-medium">Tem um PDF do exame? Eu leio pra você.</p>
        <p className="text-xs text-muted-foreground font-body mt-0.5">
          Arraste o arquivo aqui ou clique para selecionar · Máx 10MB
        </p>
      </div>
      <input
        ref={inputRef}
        id="pdf-exam-input"
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />
    </label>
  )
}
