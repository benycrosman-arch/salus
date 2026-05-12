"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Stethoscope, Mail, Loader2, Unlink } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type NutriInfo = {
  link: { id: string; status: string; created_at: string } | null
  nutri: { id: string; name: string | null; email: string | null } | null
}

/**
 * Patient-side card on /settings showing the linked nutricionista (if any)
 * and offering "Encerrar vínculo". Renders nothing while loading and when
 * the patient is unlinked — keeps the page clean for self-service users.
 */
export function MyNutriCard() {
  const router = useRouter()
  const [data, setData] = useState<NutriInfo | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/patient/nutri", { cache: "no-store" })
      .then((r) => r.json().catch(() => ({})))
      .then((body) => {
        if (cancelled) return
        setData(body as NutriInfo)
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const revoke = async () => {
    if (!data?.link?.id) return
    setRevoking(true)
    try {
      const res = await fetch(`/api/links/${data.link.id}/revoke`, { method: "POST" })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(body.error || "Falha ao encerrar vínculo.")
        return
      }
      toast.success("Vínculo encerrado.")
      setData({ link: null, nutri: null })
      setConfirmOpen(false)
      router.refresh()
    } catch {
      toast.error("Erro de rede.")
    } finally {
      setRevoking(false)
    }
  }

  if (!loaded || !data?.link || !data.nutri) return null

  return (
    <>
      <Card className="border-0 shadow-md p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1a3a2a]/10 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-[#1a3a2a]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#1a3a2a]/55 uppercase tracking-wide font-semibold">
              Meu nutricionista
            </p>
            <p className="text-sm font-medium text-[#1a3a2a] truncate">
              {data.nutri.name || data.nutri.email || "Nutricionista vinculado"}
            </p>
          </div>
        </div>
        {data.nutri.email && (
          <div className="flex items-center gap-2 text-xs text-[#1a3a2a]/60 mb-3">
            <Mail className="w-3.5 h-3.5" />
            <span className="truncate">{data.nutri.email}</span>
          </div>
        )}
        <p className="text-[11px] text-[#1a3a2a]/50 mb-4">
          Vinculado desde {new Date(data.link.created_at).toLocaleDateString("pt-BR")}.
          Ele(a) pode ver suas refeições, exames e progresso. Você pode encerrar o vínculo a qualquer momento.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          className="text-[#c4614a] border-[#c4614a]/30 hover:bg-[#c4614a]/5"
        >
          <Unlink className="w-3.5 h-3.5 mr-2" />
          Encerrar vínculo
        </Button>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar vínculo com nutricionista?</DialogTitle>
            <DialogDescription>
              {data.nutri.name ? `${data.nutri.name} ` : "Seu nutricionista "}
              não terá mais acesso aos seus dados. Suas refeições e exames continuam no app, só
              o nutricionista é desvinculado. Você pode aceitar um novo convite depois.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={revoking}>
              Cancelar
            </Button>
            <Button
              onClick={revoke}
              disabled={revoking}
              className="bg-[#c4614a] hover:bg-[#c4614a]/90 text-white"
            >
              {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Encerrar vínculo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
