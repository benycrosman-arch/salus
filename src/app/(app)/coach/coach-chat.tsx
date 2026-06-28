"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet"
import {
  Loader2, Send, Sparkles, Plus, History, MessageCircle, Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { track } from "@/lib/posthog"
import { cn } from "@/lib/utils"

interface Conversation {
  id: string
  title: string | null
  last_message_at: string
  created_at: string
}

interface CoachMessage {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

const SUGGESTIONS = [
  "O que comer no almoço hoje?",
  "Como tá meu progresso essa semana?",
  "Me dá uma ideia de lanche com proteína",
  "Por que devo focar em fibra hoje?",
]

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso)
    const today = new Date().toDateString() === d.toDateString()
    if (today) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  } catch {
    return ""
  }
}

export function CoachChat() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlConversation = searchParams.get("c")

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [draft, setDraft] = useState("")
  const [booting, setBooting] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/coach/conversations", { cache: "no-store" })
    const payload = await res.json().catch(() => ({}))
    if (res.ok) setConversations((payload.conversations ?? []) as Conversation[])
    return (payload.conversations ?? []) as Conversation[]
  }, [])

  const openConversation = useCallback(async (id: string) => {
    setActiveId(id)
    setLoadingThread(true)
    setHistoryOpen(false)
    try {
      const res = await fetch(`/api/coach/conversations/${id}`, { cache: "no-store" })
      const payload = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessages((payload.messages ?? []) as CoachMessage[])
      } else {
        toast.error(payload.error ?? "Não consegui abrir essa conversa.")
        setMessages([])
      }
    } finally {
      setLoadingThread(false)
    }
  }, [])

  // Boot: load thread list, then open the URL-pinned one, else the latest.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const list = await loadConversations()
      if (cancelled) return
      const target = urlConversation && list.some((c) => c.id === urlConversation)
        ? urlConversation
        : list[0]?.id ?? null
      if (target) await openConversation(target)
      if (!cancelled) setBooting(false)
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll on new messages / typing.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending])

  const startNew = useCallback(() => {
    setActiveId(null)
    setMessages([])
    setHistoryOpen(false)
    router.replace("/coach")
  }, [router])

  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? draft).trim()
    if (!content || sending) return
    setSending(true)
    setDraft("")

    // Optimistic user bubble.
    const tempId = `temp-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content, created_at: new Date().toISOString() },
    ])

    try {
      // Lazily create a conversation on the first message.
      let conversationId = activeId
      if (!conversationId) {
        const res = await fetch("/api/coach/conversations", { method: "POST" })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok || !payload.conversation) {
          toast.error(payload.error ?? "Não consegui iniciar a conversa.")
          setMessages((prev) => prev.filter((m) => m.id !== tempId))
          return
        }
        conversationId = payload.conversation.id as string
        setActiveId(conversationId)
        router.replace(`/coach?c=${conversationId}`)
      }

      const res = await fetch(`/api/coach/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const payload = await res.json().catch(() => ({}))

      if (!res.ok) {
        // Keep the user's message visible; tell them to retry.
        if (payload.userMessage) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? (payload.userMessage as CoachMessage) : m)),
          )
        }
        toast.error(payload.error ?? "O coach não respondeu. Tente de novo.")
        return
      }

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId)
        const next = [...withoutTemp]
        if (payload.userMessage) next.push(payload.userMessage as CoachMessage)
        if (payload.assistantMessage) next.push(payload.assistantMessage as CoachMessage)
        return next
      })
      track("coach_message_sent", { length: content.length })
      void loadConversations()
    } catch {
      toast.error("Erro de rede. Tente novamente.")
    } finally {
      setSending(false)
    }
  }, [draft, sending, activeId, router, loadConversations])

  const deleteConversation = useCallback(async (id: string) => {
    const res = await fetch(`/api/coach/conversations/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Não consegui apagar a conversa.")
      return
    }
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (id === activeId) startNew()
  }, [activeId, startNew])

  if (booting) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#1a3a2a]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-260px)] lg:h-[calc(100vh-220px)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#e4ddd4]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#1a3a2a] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#1a3a2a] font-sans leading-tight">Coach Salus</h2>
            <p className="text-xs text-[#1a3a2a]/60 font-body truncate">
              Seu coach de nutrição com IA — sabe seus exames, metas e refeições
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-[#e4ddd4]">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Histórico</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[360px] bg-[#faf8f4] p-0">
              <SheetHeader className="p-5 pb-3 border-b border-[#e4ddd4]">
                <SheetTitle className="text-[#1a3a2a]">Conversas</SheetTitle>
              </SheetHeader>
              <div className="p-3">
                <Button onClick={startNew} className="w-full gap-2 rounded-xl bg-[#1a3a2a] hover:bg-[#1a3a2a]/90 mb-2">
                  <Plus className="w-4 h-4" /> Nova conversa
                </Button>
              </div>
              <div className="overflow-y-auto px-3 pb-6 space-y-1">
                {conversations.length === 0 ? (
                  <p className="text-sm text-[#1a3a2a]/50 font-body text-center py-8 px-4">
                    Nenhuma conversa ainda. Manda a primeira pergunta.
                  </p>
                ) : (
                  conversations.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        "group flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition-colors",
                        c.id === activeId ? "bg-[#1a3a2a]/[0.07]" : "hover:bg-[#1a3a2a]/[0.04]",
                      )}
                      onClick={() => openConversation(c.id)}
                    >
                      <MessageCircle className="w-4 h-4 text-[#1a3a2a]/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a3a2a] truncate font-body">
                          {c.title?.trim() || "Conversa sem título"}
                        </p>
                        <p className="text-[11px] text-[#1a3a2a]/40">{formatRelative(c.last_message_at)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); void deleteConversation(c.id) }}
                        className="opacity-0 group-hover:opacity-100 text-[#1a3a2a]/30 hover:text-[#c4614a] transition-all p-1"
                        aria-label="Apagar conversa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Button
            onClick={startNew}
            size="sm"
            variant="ghost"
            className="gap-1.5 rounded-xl text-[#1a3a2a] hover:bg-[#1a3a2a]/5"
            aria-label="Nova conversa"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 space-y-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversa com o Coach Salus"
      >
        {loadingThread ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[#1a3a2a]/50" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[#1a3a2a]/[0.06] flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-[#1a3a2a]" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h2 className="text-lg font-bold text-[#1a3a2a] font-sans">Oi! Sou seu coach 👋</h2>
              <p className="text-sm text-[#1a3a2a]/60 font-body leading-relaxed">
                Pergunta o que quiser sobre sua alimentação. Eu uso seus dados reais de hoje —
                metas, refeições, exames e a orientação da sua nutri.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-xs font-body text-[#1a3a2a] bg-white ring-1 ring-[#e4ddd4] rounded-full px-3.5 py-2 hover:bg-[#1a3a2a]/[0.04] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === "user"
            return (
              <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm",
                    isUser
                      ? "bg-[#1a3a2a] text-white rounded-br-md"
                      : "bg-white text-[#1a3a2a] ring-1 ring-black/[0.04] rounded-bl-md",
                  )}
                >
                  <p className="text-sm font-body whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            )
          })
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white text-[#1a3a2a] ring-1 ring-black/[0.04] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1a3a2a]/40 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#1a3a2a]/40 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#1a3a2a]/40 animate-bounce" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="pt-3 border-t border-[#e4ddd4] flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Pergunta pro seu coach..."
          aria-label="Mensagem para o coach"
          className="min-h-[44px] max-h-32 resize-none rounded-2xl border-[#e4ddd4] bg-white text-sm font-body"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
          disabled={sending}
        />
        <Button
          onClick={() => handleSend()}
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
