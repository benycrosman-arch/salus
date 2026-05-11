"use client"

import { useRef, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileText, Loader2, Trash2, Upload, AlertCircle, Paperclip } from "lucide-react"
import { toast } from "sonner"

interface Attachment {
  id: string
  storage_path: string
  original_filename: string | null
  byte_size: number | null
  page_count: number | null
  kind: string
  extracted_at: string | null
  created_at: string
}

interface Props {
  patientId: string
  initialAttachments: Attachment[]
}

const MAX_BYTES = 10 * 1024 * 1024

const KIND_LABELS: Record<string, string> = {
  meal_plan: "Plano alimentar",
  training: "Treino",
  exam_guidance: "Orientação de exame",
  other: "Outro",
}

function formatBytes(n: number | null): string {
  if (!n) return "—"
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function AttachmentsUploader({ patientId, initialAttachments }: Props) {
  const [items, setItems] = useState<Attachment[]>(initialAttachments)
  const [kind, setKind] = useState<string>("meal_plan")
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error("PDF muito grande (máx 10 MB).")
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("patientId", patientId)
      fd.append("kind", kind)
      const res = await fetch("/api/nutri/attachments", { method: "POST", body: fd })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof payload?.error === "string" ? payload.error : "Erro no upload.")
        return
      }
      const newItem: Attachment = {
        id: payload.attachmentId,
        storage_path: `${patientId}/${payload.attachmentId}.pdf`,
        original_filename: file.name,
        byte_size: file.size,
        page_count: null,
        kind,
        extracted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }
      setItems((prev) => [newItem, ...prev])
      toast.success("PDF enviado. A IA já está usando o conteúdo no acompanhamento.")
    } catch {
      toast.error("Erro de rede.")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este anexo? O paciente perderá o acesso a este PDF.")) return
    startTransition(async () => {
      const res = await fetch(`/api/nutri/attachments/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        toast.error(typeof payload?.error === "string" ? payload.error : "Erro ao remover.")
        return
      }
      setItems((prev) => prev.filter((a) => a.id !== id))
      toast.success("Anexo removido.")
    })
  }

  return (
    <Card className="border-0 shadow-md p-6">
      <h2 className="text-sm font-semibold text-[#1a3a2a] mb-3 flex items-center gap-2">
        <Paperclip className="w-4 h-4" />
        Materiais anexados (PDF)
      </h2>
      <p className="text-xs text-[#1a3a2a]/60 font-body mb-4 leading-relaxed">
        Anexe plano alimentar, treino ou orientações. O conteúdo é extraído e usado como referência
        pela IA quando ela conversa com o paciente.
      </p>

      <div className="flex gap-2 mb-3">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          disabled={uploading}
          className="rounded-lg border border-[#e4ddd4] bg-white px-3 py-1.5 text-xs text-[#1a3a2a] font-body focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/20"
        >
          <option value="meal_plan">Plano alimentar</option>
          <option value="training">Treino</option>
          <option value="exam_guidance">Orientação de exame</option>
          <option value="other">Outro</option>
        </select>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files?.[0]
          if (f) handleFile(f)
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? "border-[#1a3a2a]/60 bg-[#1a3a2a]/5"
            : "border-[#e4ddd4] bg-[#fafaf7]"
        }`}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-[#1a3a2a]/70">
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando e extraindo conteúdo…
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-[#1a3a2a]/30 mx-auto mb-2" />
            <p className="text-xs text-[#1a3a2a]/60 font-body mb-3">
              Arraste o PDF aqui ou clique abaixo. Máx 10 MB, 30 páginas.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              className="rounded-xl"
            >
              Escolher PDF
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </>
        )}
      </div>

      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-[#e4ddd4]">
          {items.map((a) => (
            <li key={a.id} className="py-3 flex items-center gap-3">
              <FileText className="w-4 h-4 text-[#1a3a2a]/40 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#1a3a2a] truncate">
                  {a.original_filename ?? "documento.pdf"}
                </p>
                <p className="text-[11px] text-[#1a3a2a]/40 font-body flex flex-wrap gap-x-2">
                  <span>{KIND_LABELS[a.kind] ?? a.kind}</span>
                  <span>·</span>
                  <span>{formatBytes(a.byte_size)}</span>
                  {a.page_count && (
                    <>
                      <span>·</span>
                      <span>{a.page_count} pág.</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{new Date(a.created_at).toLocaleDateString("pt-BR")}</span>
                  {!a.extracted_at && (
                    <span className="inline-flex items-center gap-0.5 text-[#c4944a]">
                      <AlertCircle className="w-3 h-3" />
                      extração pendente
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(a.id)}
                disabled={pending}
                className="text-[#c4614a]/70 hover:text-[#c4614a] disabled:opacity-50 p-1.5 rounded-lg"
                aria-label="Remover anexo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
