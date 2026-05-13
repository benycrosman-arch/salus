"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, MessageCircle, Send } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  created_at: string
}

const POLL_INTERVAL_MS = 5000

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const sameDay = new Date().toDateString() === d.toDateString()
    if (sameDay) {
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

export function PatientChat({
  patientId,
  patientName,
}: {
  patientId: string
  patientName: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchChat = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const res = await fetch(`/api/nutri/pacientes/${patientId}/chats`, {
          cache: "no-store",
        })
        const payload = (await res.json().catch(() => ({}))) as {
          messages?: ChatMessage[]
          error?: string
        }
        if (!res.ok) {
          if (!silent) toast.error(payload.error ?? "Não consegui carregar as mensagens.")
          return
        }
        setMessages(payload.messages ?? [])
      } catch {
        if (!silent) toast.error("Erro de rede.")
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [patientId],
  )

  useEffect(() => {
    void fetchChat()
    const interval = setInterval(() => void fetchChat(true), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchChat])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages.length])

  const send = async () => {
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/nutri/pacientes/${patientId}/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const payload = (await res.json().catch(() => ({}))) as {
        message?: ChatMessage
        error?: string
      }
      if (!res.ok || !payload.message) {
        toast.error(payload.error ?? "Falha ao enviar.")
        return
      }
      setMessages((m) => [...m, payload.message!])
      setDraft("")
    } catch {
      toast.error("Erro de rede.")
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="border-0 shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-4 h-4 text-[#1a3a2a]/70" />
        <h2 className="text-sm font-semibold text-[#1a3a2a]">
          Mensagens com {patientName}
        </h2>
      </div>

      <div
        ref={scrollRef}
        className="border border-[#e4ddd4] rounded-2xl h-80 overflow-y-auto p-4 bg-[#faf8f4] space-y-2 mb-3"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[#1a3a2a]/40" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[#1a3a2a]/50 text-center py-12 font-body">
            Nenhuma mensagem ainda. Envie a primeira para o paciente.
          </p>
        ) : (
          messages.map((m) => {
            const fromNutri = m.role === "assistant"
            return (
              <div
                key={m.id}
                className={cn("flex", fromNutri ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2",
                    fromNutri
                      ? "bg-[#1a3a2a] text-white"
                      : "bg-white border border-[#e4ddd4] text-[#1a3a2a]",
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={cn(
                      "text-[10px] mt-1",
                      fromNutri ? "text-white/60" : "text-[#1a3a2a]/40",
                    )}
                  >
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          placeholder="Escreva uma mensagem..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          rows={2}
          className="flex-1 resize-none"
        />
        <Button
          onClick={() => void send()}
          disabled={!draft.trim() || sending}
          size="icon"
          className="rounded-xl bg-[#1a3a2a] hover:bg-[#1a3a2a]/90 h-10 w-10"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </Card>
  )
}
