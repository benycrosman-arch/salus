"use client"

import { useRef, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  FileText,
  Image as ImageIcon,
  StickyNote,
  Loader2,
  Trash2,
  Upload,
  AlertCircle,
  Paperclip,
} from "lucide-react"
import { toast } from "sonner"

type MediaKind = "pdf" | "image" | "text"

interface Attachment {
  id: string
  storage_path: string | null
  original_filename: string | null
  byte_size: number | null
  page_count: number | null
  kind: string
  media_kind: MediaKind | null
  extracted_at: string | null
  created_at: string
}

interface Props {
  patientId: string
  initialAttachments: Attachment[]
}

const MAX_BYTES = 10 * 1024 * 1024
const MAX_NOTE_CHARS = 8000

const KIND_LABELS: Record<string, string> = {
  meal_plan: "Plano alimentar",
  training: "Treino",
  exam_guidance: "Orientação de exame",
  other: "Outro",
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

function formatBytes(n: number | null): string {
  if (!n) return "—"
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function mediaIcon(media: MediaKind | null) {
  if (media === "image") return <ImageIcon className="w-4 h-4 text-[#1a3a2a]/40 flex-shrink-0" />
  if (media === "text") return <StickyNote className="w-4 h-4 text-[#1a3a2a]/40 flex-shrink-0" />
  return <FileText className="w-4 h-4 text-[#1a3a2a]/40 flex-shrink-0" />
}

export function AttachmentsUploader({ patientId, initialAttachments }: Props) {
  const [items, setItems] = useState<Attachment[]>(initialAttachments)
  const [tab, setTab] = useState<MediaKind>("pdf")
  const [kind, setKind] = useState<string>("meal_plan")
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [noteTitle, setNoteTitle] = useState("")
  const [noteBody, setNoteBody] = useState("")
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const wantImage = tab === "image"
    if (wantImage && !IMAGE_TYPES.includes(file.type)) {
      toast.error("Use uma foto JPG, PNG, WEBP ou GIF.")
      return
    }
    if (!wantImage && file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo muito grande (máx 10 MB).")
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("source", wantImage ? "image" : "pdf")
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
        storage_path: `${patientId}/${payload.attachmentId}`,
        original_filename: file.name,
        byte_size: file.size,
        page_count: null,
        kind,
        media_kind: wantImage ? "image" : "pdf",
        extracted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }
      setItems((prev) => [newItem, ...prev])
      toast.success("Material enviado. A IA já está usando o conteúdo no acompanhamento.")
    } catch {
      toast.error("Erro de rede.")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function handleSaveNote() {
    const body = noteBody.trim()
    if (body.length < 3) {
      toast.error("Escreva a nota.")
      return
    }
    if (body.length > MAX_NOTE_CHARS) {
      toast.error(`Nota muito longa (máx ${MAX_NOTE_CHARS} caracteres).`)
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("source", "text")
      fd.append("text", body)
      fd.append("title", noteTitle.trim())
      fd.append("patientId", patientId)
      fd.append("kind", kind)
      const res = await fetch("/api/nutri/attachments", { method: "POST", body: fd })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof payload?.error === "string" ? payload.error : "Erro ao salvar.")
        return
      }
      const newItem: Attachment = {
        id: payload.attachmentId,
        storage_path: null,
        original_filename: noteTitle.trim() || "Nota",
        byte_size: new Blob([body]).size,
        page_count: null,
        kind,
        media_kind: "text",
        extracted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }
      setItems((prev) => [newItem, ...prev])
      setNoteTitle("")
      setNoteBody("")
      toast.success("Nota salva. A IA já está usando o conteúdo no acompanhamento.")
    } catch {
      toast.error("Erro de rede.")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este material? O paciente perderá o acesso a ele.")) return
    startTransition(async () => {
      const res = await fetch(`/api/nutri/attachments/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        toast.error(typeof payload?.error === "string" ? payload.error : "Erro ao remover.")
        return
      }
      setItems((prev) => prev.filter((a) => a.id !== id))
      toast.success("Material removido.")
    })
  }

  const tabs: { id: MediaKind; label: string; icon: React.ReactNode }[] = [
    { id: "pdf", label: "PDF", icon: <FileText className="w-3.5 h-3.5" /> },
    { id: "image", label: "Foto", icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: "text", label: "Texto", icon: <StickyNote className="w-3.5 h-3.5" /> },
  ]

  return (
    <Card className="border-0 shadow-md p-6">
      <h2 className="text-sm font-semibold text-[#1a3a2a] mb-3 flex items-center gap-2">
        <Paperclip className="w-4 h-4" />
        Materiais para o paciente
      </h2>
      <p className="text-xs text-[#1a3a2a]/60 font-body mb-4 leading-relaxed">
        Disponibilize plano alimentar, treino ou orientações como PDF, foto ou nota de texto. O
        conteúdo é usado como referência pela IA quando ela conversa com o paciente.
      </p>

      <div className="flex gap-1 mb-4 rounded-lg bg-[#fafaf7] p-1 border border-[#e4ddd4]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            disabled={uploading}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.id
                ? "bg-white text-[#1a3a2a] shadow-sm"
                : "text-[#1a3a2a]/50 hover:text-[#1a3a2a]/80"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <label className="sr-only" htmlFor="att-kind">
          Categoria
        </label>
        <select
          id="att-kind"
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

      {tab === "text" ? (
        <div className="space-y-2">
          <input
            type="text"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            disabled={uploading}
            placeholder="Título (opcional)"
            maxLength={120}
            className="w-full rounded-lg border border-[#e4ddd4] bg-white px-3 py-2 text-sm text-[#1a3a2a] font-body focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/20"
          />
          <textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            disabled={uploading}
            placeholder="Escreva a orientação, recomendação ou plano em texto…"
            rows={5}
            maxLength={MAX_NOTE_CHARS}
            className="w-full rounded-lg border border-[#e4ddd4] bg-white px-3 py-2 text-sm text-[#1a3a2a] font-body focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/20 resize-y"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#1a3a2a]/40 font-body">
              {noteBody.length}/{MAX_NOTE_CHARS}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveNote}
              disabled={uploading || noteBody.trim().length < 3}
              className="rounded-xl"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Salvando…
                </>
              ) : (
                "Salvar nota"
              )}
            </Button>
          </div>
        </div>
      ) : (
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
            dragOver ? "border-[#1a3a2a]/60 bg-[#1a3a2a]/5" : "border-[#e4ddd4] bg-[#fafaf7]"
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
                {tab === "image"
                  ? "Arraste a foto aqui ou clique abaixo. JPG, PNG, WEBP ou GIF, máx 10 MB."
                  : "Arraste o PDF aqui ou clique abaixo. Máx 10 MB, 30 páginas."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                className="rounded-xl"
              >
                {tab === "image" ? "Escolher foto" : "Escolher PDF"}
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept={tab === "image" ? IMAGE_TYPES.join(",") : "application/pdf"}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </>
          )}
        </div>
      )}

      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-[#e4ddd4]">
          {items.map((a) => (
            <li key={a.id} className="py-3 flex items-center gap-3">
              {mediaIcon(a.media_kind)}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#1a3a2a] truncate">
                  {a.original_filename ?? (a.media_kind === "text" ? "Nota" : "documento")}
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
                aria-label="Remover material"
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
