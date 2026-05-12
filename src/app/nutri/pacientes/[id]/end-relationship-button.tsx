"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Unlink } from "lucide-react"
import { toast } from "sonner"

/**
 * Nutri-side: end the relationship with a paciente. Calls the same
 * /api/links/[id]/revoke endpoint the paciente uses — the revoke_link
 * RPC accepts either party.
 */
export function EndRelationshipButton({
  linkId,
  patientName,
  redirectTo = "/nutri/pacientes",
}: {
  linkId: string
  patientName: string
  redirectTo?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const revoke = async () => {
    setRevoking(true)
    try {
      const res = await fetch(`/api/links/${linkId}/revoke`, { method: "POST" })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(body.error || "Falha ao encerrar vínculo.")
        return
      }
      toast.success("Vínculo encerrado.")
      setOpen(false)
      router.push(redirectTo)
      router.refresh()
    } catch {
      toast.error("Erro de rede.")
    } finally {
      setRevoking(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-[#c4614a] border-[#c4614a]/30 hover:bg-[#c4614a]/5"
      >
        <Unlink className="w-3.5 h-3.5 mr-2" />
        Encerrar vínculo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar vínculo com {patientName}?</DialogTitle>
            <DialogDescription>
              Você não terá mais acesso aos dados de {patientName}. Os dados ficam com o(a)
              paciente; só o seu acesso é revogado. Para retomar, é preciso enviar um novo
              convite.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={revoking}>
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
