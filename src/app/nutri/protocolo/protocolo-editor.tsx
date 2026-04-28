"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function ProtocoloEditor({ initial }: { initial: string }) {
  const router = useRouter()
  const [text, setText] = useState(initial)
  const [saving, setSaving] = useState(false)
  const dirty = text !== initial
  const valid = text.trim().length >= 60

  const handleSave = async () => {
    if (!valid) {
      toast.error("Mínimo 60 caracteres.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/nutri/protocol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocol: text }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error || "Falha ao salvar")
        return
      }
      toast.success("Protocolo atualizado")
      router.refresh()
    } catch {
      toast.error("Erro de rede")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-0 shadow-md p-6 space-y-4">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 4000))}
        rows={14}
        className="font-body resize-none"
        placeholder="Descreva seu protocolo de atendimento..."
      />
      <div className="flex items-center justify-between text-xs text-[#1a3a2a]/60 font-body">
        <span>
          {text.trim().length < 60
            ? `Mínimo 60 caracteres (${text.trim().length}/60)`
            : "✓ Suficiente"}
        </span>
        <span>{text.length}/4000</span>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || !valid || saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>
    </Card>
  )
}
