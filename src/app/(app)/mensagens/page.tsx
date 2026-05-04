"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, Stethoscope, MessageCircle, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { track } from "@/lib/posthog"
import { cn } from "@/lib/utils"

interface NutriRef {
  id: string
  name: string | null
}

interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  created_at: string
}

interface ChatPayload {
  nutri: NutriRef | null
  messages: ChatMessage[]
}

const POLL_INTERVAL_MS = 5000

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const sameDay = new Date().toDateString() === d.toDateString()
    if (sameDay) {
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

export default function MensagensPage() {
  const [nutri, setNutri] = useState<NutriRef | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastReceivedCountRef = useRef(0)

  const fetchChat = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch("/api/nutri/chats", { cache: "no-store" })
      const payload = (await res.json().catch(() => ({}))) as Partial<ChatPayload> & { error?: string }
      if (!res.ok) {
        if (!silent) setError(payload.error ?? "Não consegui carregar suas mensagens.")
        return
      }
      setError(null)
      setNutri(payload.nutri ?? null)
      const next = (payload.messages ?? []) as ChatMessage[]
      // Detect a new assistant message (nutri replied) for analytics.
      const prevAssistantCount = messages.filter((m) => m.role === "assistant").length
      const nextAssistantCount = next.filter((m) => m.role === "assistant").length
      if (silent && nextAssistantCount > prevAssistantCount) {
        track("nutri_message_received", { delta: nextAssistantCount - prevAssistantCount })
      }
      setMessages(next)
      lastReceivedCountRef.current = next.length
    } catch {
      if (!silent) setError("Erro de rede. Tente novamente.")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [messages])

  useEffect(() => {
    fetchChat(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll silently every 5s for new messages from the nutri side.
  useEffect(() => {
    if (!nutri) return
    const id = setInterval(() => fetchChat(true), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [nutri, fetchChat])

  // Auto-scroll to bottom when message list grows.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  const handleSend = async () => {
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    try {
      const res = await fetch("/api/nutri/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof payload?.error === "string" ? payload.error : "Não consegui enviar.")
        return
      }
      const inserted = payload.message as ChatMessage | undefined
      if (inserted) {
        setMessages((prev) => [...prev, inserted])
      }
      setDraft("")
      track("nutri_message_sent", { length: content.length })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="page-enter flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#1a3a2a]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-enter min-h-[60vh] flex items-center justify-center px-4 py-12">
        <Card className="border-0 shadow-md max-w-md w-full p-8 text-center space-y-4">
          <p className="text-sm text-[#1a3a2a]/70 font-body">{error}</p>
          <Button onClick={() => fetchChat(false)}>Tentar novamente</Button>
        </Card>
      </div>
    )
  }

  if (!nutri) {
    return (
      <div className="page-enter min-h-[60vh] flex items-center justify-center px-4 py-12">
        <Card className="border-0 shadow-md max-w-md w-full p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[#1a3a2a]/5 flex items-center justify-center mx-auto">
            <Stethoscope className="w-7 h-7 text-[#1a3a2a]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold font-sans text-[#1a3a2a]">Mensagens</h1>
            <p className="text-sm text-[#1a3a2a]/60 font-body leading-relaxed">
              Você ainda não tem um nutricionista vinculado. Quando aceitar um convite por aqui ou
              pelo WhatsApp, esse espaço vira o seu canal direto de conversa.
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2 rounded-xl">
            <Link href="/dashboard">
              Voltar ao dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </Card>
      </div>
    )
  }

  const nutriName = nutri.name?.trim() || "Seu nutricionista"

  return (
    <div className="page-enter flex flex-col h-[calc(100vh-200px)] lg:h-[calc(100vh-160px)]">
      <div className="flex items-center gap-3 pb-4 border-b border-[#e4ddd4]">
        <div className="w-10 h-10 rounded-full bg-[#1a3a2a]/10 flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-[#1a3a2a]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#1a3a2a] font-sans leading-tight">{nutriName}</h1>
          <p className="text-xs text-[#1a3a2a]/60 font-body">Mensagens diretas — atualiza a cada 5s</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
            <MessageCircle className="w-10 h-10 text-[#1a3a2a]/30" />
            <p className="text-sm text-[#1a3a2a]/60 font-body max-w-xs">
              Nenhuma mensagem ainda. Manda a primeira pergunta — uma dúvida do plano, dos exames, ou
              só um oi.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isPatient = m.role === "user"
            return (
              <div key={m.id} className={cn("flex", isPatient ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm",
                    isPatient
                      ? "bg-[#1a3a2a] text-white rounded-br-md"
                      : "bg-white text-[#1a3a2a] ring-1 ring-black/[0.04] rounded-bl-md",
                  )}
                >
                  <p className="text-sm font-body whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  <p className={cn(
                    "text-[10px] mt-1 font-body",
                    isPatient ? "text-white/60" : "text-[#1a3a2a]/40",
                  )}>
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="pt-3 border-t border-[#e4ddd4] flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Mensagem para ${nutriName}...`}
          className="min-h-[44px] max-h-32 resize-none rounded-2xl border-[#e4ddd4] bg-white text-sm font-body"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void handleSend()
            }
          }}
          disabled={sending}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="rounded-2xl bg-[#1a3a2a] hover:bg-[#1a3a2a]/90 h-11 w-11 shrink-0 p-0"
          aria-label="Enviar mensagem"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
