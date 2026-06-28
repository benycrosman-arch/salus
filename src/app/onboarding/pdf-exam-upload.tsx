"use client"

import { useRef, useState, type ChangeEvent } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  Upload,
  FileCheck2,
  AlertCircle,
  RefreshCw,
  Camera,
  ImageIcon,
  FileText,
  X,
  Plus,
} from "@/components/icons"
import { toast } from "sonner"
import { AIClientError, callEdgeFunction } from "@/lib/ai-client"

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

export type LabStatus =
  | "critical_low"
  | "low"
  | "borderline_low"
  | "optimal"
  | "borderline_high"
  | "high"
  | "critical_high"

export interface InterpretedMarkerView {
  rawMarker: string
  value: number
  unit: string
  reference_min: number | null
  reference_max: number | null
  canonical: string | null
  label: string | null
  status: LabStatus | null
  message: string | null
  flag: string | null
  source: string | null
  outOfRange: boolean
}

export interface ParsedPdfResult {
  uploadId: string
  measuredAt: string | null
  knownLabs: Record<KnownLabKey, number | null>
  extraLabs: ExtraLab[]
  confidence: "high" | "medium" | "low"
  notes: string
  fallback?: "manual"
  code?: string
  savedCount?: number
  interpretation?: {
    markers: InterpretedMarkerView[]
    flags: string[]
    rollup: {
      optimal: number
      borderline: number
      out_of_range: number
      critical: number
      total: number
    }
  }
}

type State =
  | { kind: "idle" }
  | { kind: "preparing"; label: string }
  | { kind: "uploading"; label: string }
  | { kind: "done"; label: string; result: ParsedPdfResult }
  | { kind: "fallback"; label: string; result: ParsedPdfResult; reason: string }
  | { kind: "error"; message: string; code?: string }

interface Props {
  onParsed: (result: ParsedPdfResult) => void
  onReset: () => void
  patientId?: string
}

const MAX_PDF_BYTES = 10 * 1024 * 1024
const MAX_IMAGE_BYTES_INPUT = 12 * 1024 * 1024 // accept up to 12 MB raw photos; we downscale before send
const MAX_IMAGE_BYTES_SEND = 4 * 1024 * 1024 // target after downscale
const MAX_IMAGES = 8
const MAX_IMAGE_DIMENSION = 2200

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

interface StagedImage {
  id: string
  file: File
  previewUrl: string
}

const CODE_MESSAGES: Record<string, string> = {
  anthropic_overloaded: "IA sobrecarregada. Tente de novo em 30s ou preencha manual abaixo.",
  anthropic_rate_limit: "Muitas requisições. Tente em alguns segundos.",
  anthropic_network: "A IA demorou demais. Tente PDF/foto menor ou preencha manual.",
  anthropic_billing: "Saldo de IA acabou. Avise o suporte (admin precisa adicionar créditos no Anthropic).",
  anthropic_invalid_request: "A IA não conseguiu processar o formato. Tente uma foto mais nítida.",
  anthropic_auth: "IA temporariamente desconfigurada. Avise o suporte.",
  api_key_missing: "IA temporariamente desconfigurada. Avise o suporte.",
  too_large: "Arquivo grande demais. Tire fotos mais leves ou divida o PDF.",
  too_many_pages: "PDF com muitas páginas. Reduza pra até 35 páginas.",
  too_many_images: "Muitas fotos. Máximo 8 por envio.",
  bad_type: "Aceitamos só PDF ou foto (JPEG/PNG/WebP).",
  empty_file: "Arquivo veio vazio. Tente de novo.",
  forbidden: "Você não tem permissão para subir esse exame.",
  no_link: "Esse paciente não está mais vinculado a você.",
  empty_extraction: "Não consegui ler nenhum marcador. Preencha manual abaixo.",
}

function formatMeasuredAt(iso: string | null): string | null {
  if (!iso) return null
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return null
  return `${d}/${m}/${y}`
}

function isImage(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.has(file.type)
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf"
}

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase()
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  )
}

async function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string") return reject(new Error("Failed to read file"))
      const idx = result.indexOf(",")
      resolve(idx >= 0 ? result.slice(idx + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"))
    reader.readAsDataURL(file)
  })
}

// Downscale via canvas. iOS photos can be 4032×3024 / 5-10 MB — OCR doesn't
// need that. Reduce to MAX_IMAGE_DIMENSION on the long side, JPEG quality 0.85.
async function downscaleImage(file: File): Promise<Blob> {
  if (file.size <= MAX_IMAGE_BYTES_SEND) return file
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  const { width, height } = bitmap
  const longSide = Math.max(width, height)
  const scale = longSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longSide : 1
  const targetW = Math.round(width * scale)
  const targetH = Math.round(height * scale)

  const canvas = document.createElement("canvas")
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext("2d")
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, targetW, targetH)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
  )
  bitmap.close?.()
  if (!blob) return file
  // If somehow the downscaled blob is larger, keep the original.
  return blob.size < file.size ? blob : file
}

export function PdfExamUpload({ onParsed, onReset, patientId }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" })
  const [dragOver, setDragOver] = useState(false)
  const [pdf, setPdf] = useState<File | null>(null)
  const [images, setImages] = useState<StagedImage[]>([])
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setState({ kind: "idle" })
    setPdf(null)
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl))
    setImages([])
    if (pdfInputRef.current) pdfInputRef.current.value = ""
    if (galleryInputRef.current) galleryInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
    onReset()
  }

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files)
    if (arr.length === 0) return

    const pdfCandidates = arr.filter(isPdf)
    const heicCandidates = arr.filter(isHeic)
    const cleanImages = arr.filter((f) => isImage(f) && !isHeic(f))
    const unknown = arr.filter(
      (f) => !isPdf(f) && !f.type.startsWith("image/") && !isHeic(f),
    )

    if (heicCandidates.length > 0) {
      toast.error(
        "Foto em HEIC. No iPhone: Ajustes → Câmera → Formatos → 'Mais Compatível'. Ou exporte em JPEG.",
      )
      if (cleanImages.length === 0 && pdfCandidates.length === 0) return
    }
    if (unknown.length > 0) {
      toast.error("Só aceitamos PDF ou foto (JPEG, PNG, WebP).")
      return
    }
    if (pdfCandidates.length > 0 && (cleanImages.length > 0 || images.length > 0)) {
      toast.error("Envie PDF OU fotos — não os dois juntos.")
      return
    }
    if (pdfCandidates.length > 1) {
      toast.error("Um PDF por vez.")
      return
    }
    if (pdfCandidates.length === 1) {
      const f = pdfCandidates[0]
      if (f.size > MAX_PDF_BYTES) {
        toast.error("PDF acima do limite (10 MB).")
        return
      }
      if (images.length > 0) {
        toast.error("Você já tem fotos selecionadas. Remova-as antes de mandar PDF.")
        return
      }
      setPdf(f)
      return
    }

    if (cleanImages.length > 0) {
      if (pdf) {
        toast.error("Você já selecionou um PDF. Remova-o antes de mandar fotos.")
        return
      }
      const remaining = MAX_IMAGES - images.length
      if (remaining <= 0) {
        toast.error(`Máximo de ${MAX_IMAGES} fotos.`)
        return
      }
      const toAdd: StagedImage[] = []
      for (const f of cleanImages.slice(0, remaining)) {
        if (f.size > MAX_IMAGE_BYTES_INPUT) {
          toast.error(`"${f.name}" acima de 12 MB. Tira outra com menos resolução.`)
          continue
        }
        toAdd.push({
          id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file: f,
          previewUrl: URL.createObjectURL(f),
        })
      }
      if (cleanImages.length > remaining) {
        toast.warning(`Só adicionei ${remaining}; máx ${MAX_IMAGES} fotos por envio.`)
      }
      setImages((prev) => [...prev, ...toAdd])
    }
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((i) => i.id !== id)
    })
  }

  async function handleSubmit() {
    if (!pdf && images.length === 0) {
      toast.error("Selecione um PDF ou pelo menos uma foto.")
      return
    }
    const label = pdf
      ? pdf.name
      : `${images.length} ${images.length === 1 ? "foto" : "fotos"}`

    setState({ kind: "preparing", label })

    let filePayload: Array<{ name: string; mediaType: string; size: number; base64: string }>
    let mode: "pdf" | "images"
    try {
      if (pdf) {
        const base64 = await fileToBase64(pdf)
        filePayload = [{ name: pdf.name, mediaType: pdf.type, size: pdf.size, base64 }]
        mode = "pdf"
      } else {
        const downscaled = await Promise.all(
          images.map(async (img) => {
            const blob = await downscaleImage(img.file)
            const base64 = await fileToBase64(blob)
            return {
              name: img.file.name,
              mediaType: blob instanceof File ? blob.type : "image/jpeg",
              size: blob.size,
              base64,
            }
          }),
        )
        filePayload = downscaled
        mode = "images"
      }
    } catch (err) {
      console.error("[pdf-exam-upload] file prep failed", err)
      setState({ kind: "error", message: "Não consegui preparar o arquivo. Tenta de novo." })
      return
    }

    setState({ kind: "uploading", label })

    try {
      const data = await callEdgeFunction<ParsedPdfResult>(
        "ai-extract-labs",
        { mode, files: filePayload, patientId },
        // Longer timeout because Anthropic on a 5-page laudo can take 60-80s,
        // and Edge Functions tolerate that comfortably (the Vercel route can't).
        { timeoutMs: 110_000, retries: 0 },
      )

      const known = Object.values(data.knownLabs).filter((v) => v !== null).length
      const extra = data.extraLabs.length
      const total = known + extra

      if (data.fallback === "manual") {
        setState({
          kind: "fallback",
          label,
          result: data,
          reason:
            (data.code && CODE_MESSAGES[data.code]) ||
            (data as { error?: string }).error ||
            "IA indisponível agora.",
        })
        onParsed(data)
        toast.warning("Arquivo salvo. Preenche os valores manualmente abaixo.")
        return
      }

      setState({ kind: "done", label, result: data })
      onParsed(data)
      if (total === 0) {
        toast.warning("Não consegui ler nenhum marcador. Preenche manual abaixo.")
      } else {
        toast.success(
          extra > 0
            ? `Lemos ${known} dos 8 principais + ${extra} extras.`
            : `Lemos ${known} dos 8 principais.`,
        )
      }
    } catch (err) {
      if (err instanceof AIClientError) {
        const code = err.code ?? undefined
        const msg = (code && CODE_MESSAGES[code]) || err.message
        setState({ kind: "error", message: msg, code })
      } else {
        setState({ kind: "error", message: "Erro de rede ao enviar o exame." })
      }
    }
  }

  if (state.kind === "preparing" || state.kind === "uploading") {
    const isPrep = state.kind === "preparing"
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-5">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isPrep ? "Preparando arquivo…" : "Lendo seu exame com IA…"}
            </p>
            <p className="text-xs text-muted-foreground font-body truncate">{state.label}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-body mt-3">
          {isPrep
            ? "Reduzindo tamanho da imagem antes de enviar…"
            : "Pode levar 15-60s, principalmente em laudos longos."}
        </p>
      </div>
    )
  }

  if (state.kind === "done") {
    const { result } = state
    const knownCount = Object.values(result.knownLabs).filter((v) => v !== null).length
    const measured = formatMeasuredAt(result.measuredAt)
    const rollup = result.interpretation?.rollup
    return (
      <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <FileCheck2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Exame interpretado.</p>
            <p className="text-xs text-muted-foreground font-body truncate">{state.label}</p>
            <p className="text-xs font-body mt-1.5">
              {knownCount}/8 marcadores principais{measured ? ` · coleta ${measured}` : ""}
              {result.extraLabs.length > 0 ? ` · +${result.extraLabs.length} extras` : ""}
            </p>
            {rollup && rollup.total > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {rollup.optimal > 0 && (
                  <span className="inline-flex items-center text-xs font-body px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    {rollup.optimal} ótimos
                  </span>
                )}
                {rollup.borderline > 0 && (
                  <span className="inline-flex items-center text-xs font-body px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    {rollup.borderline} limítrofes
                  </span>
                )}
                {rollup.out_of_range > 0 && (
                  <span className="inline-flex items-center text-xs font-body px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-400">
                    {rollup.out_of_range} fora da faixa
                  </span>
                )}
                {rollup.critical > 0 && (
                  <span className="inline-flex items-center text-xs font-body px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400">
                    {rollup.critical} críticos
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground font-body mt-2">
              Revise os campos abaixo e ajuste se algum valor saiu errado.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Trocar
          </Button>
        </div>
      </div>
    )
  }

  if (state.kind === "fallback") {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Arquivo salvo, mas a IA não leu agora.</p>
            <p className="text-xs text-muted-foreground font-body truncate mt-0.5">{state.label}</p>
            <p className="text-xs font-body mt-2 text-amber-900 dark:text-amber-200">
              {state.reason}
            </p>
            <p className="text-xs text-muted-foreground font-body mt-2">
              Você pode preencher os valores manualmente abaixo, ou tentar de novo.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
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

  if (state.kind === "error") {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{state.message}</p>
            {state.code && (
              <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-70">
                código: {state.code}
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
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

  const hasSomething = pdf !== null || images.length > 0

  return (
    <div className="space-y-3">
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (e.target.files) addFiles(e.target.files)
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/*"
        multiple
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (e.target.files) addFiles(e.target.files)
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (e.target.files) addFiles(e.target.files)
        }}
      />

      {!hasSomething && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
          }}
          className={`rounded-xl border-2 border-dashed p-5 transition-colors ${
            dragOver
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/60 hover:bg-muted/30"
          }`}
        >
          <div className="flex flex-col items-center text-center gap-3">
            <Upload className="w-6 h-6 text-primary" />
            <div>
              <p className="text-sm font-medium">Mande o exame que eu leio.</p>
              <p className="text-xs text-muted-foreground font-body mt-0.5">
                PDF do laboratório, foto do papel ou screenshot do app.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col h-auto py-2.5 gap-1 rounded-xl"
              >
                <Camera className="w-4 h-4" />
                <span className="text-[11px] font-normal">Câmera</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col h-auto py-2.5 gap-1 rounded-xl"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="text-[11px] font-normal">Fotos</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => pdfInputRef.current?.click()}
                className="flex flex-col h-auto py-2.5 gap-1 rounded-xl"
              >
                <FileText className="w-4 h-4" />
                <span className="text-[11px] font-normal">PDF</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground font-body">
              Até 8 fotos · PDF até 10 MB · fotos grandes reduzidas automaticamente
            </p>
          </div>
        </div>
      )}

      {pdf && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{pdf.name}</p>
              <p className="text-xs text-muted-foreground font-body">
                {(pdf.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPdf(null)
                if (pdfInputRef.current) pdfInputRef.current.value = ""
              }}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg"
              aria-label="Remover PDF"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative aspect-square rounded-lg overflow-hidden border border-border bg-background"
              >
                <Image
                  src={img.previewUrl}
                  alt={img.file.name}
                  fill
                  sizes="120px"
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90"
                  aria-label="Remover foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/60 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[10px] font-body">Adicionar</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cameraInputRef.current?.click()}
              disabled={images.length >= MAX_IMAGES}
              className="rounded-xl gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              Mais uma foto
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                images.forEach((i) => URL.revokeObjectURL(i.previewUrl))
                setImages([])
              }}
              className="rounded-xl"
            >
              Limpar
            </Button>
          </div>
        </div>
      )}

      {hasSomething && (
        <Button
          type="button"
          onClick={handleSubmit}
          className="w-full h-11 rounded-xl bg-primary font-semibold gap-2"
        >
          <Upload className="w-4 h-4" />
          {pdf ? "Ler PDF do exame" : `Ler ${images.length} ${images.length === 1 ? "foto" : "fotos"}`}
        </Button>
      )}
    </div>
  )
}
