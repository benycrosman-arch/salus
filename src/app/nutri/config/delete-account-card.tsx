"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Trash2, Loader2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { resetIdentity, track } from "@/lib/posthog"

export function DeleteAccountCard() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (confirm !== "EXCLUIR") return
    setDeleting(true)
    try {
      const res = await fetch("/api/user/delete", { method: "POST" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || "Não foi possível excluir a conta.")
        return
      }
      track("account_deleted", { surface: "nutri" })
      resetIdentity()
      await supabase.auth.signOut()
      toast.success("Conta excluída.")
      router.push("/")
      router.refresh()
    } catch {
      toast.error("Erro ao excluir a conta.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card className="border-0 shadow-md p-6 ring-1 ring-red-500/20">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <p className="text-[11px] font-semibold tracking-widest uppercase text-red-500/80">
            Zona perigosa
          </p>
        </div>
        <p className="text-xs text-[#1a3a2a]/60 mb-4 font-body leading-relaxed">
          Excluir a conta apaga seu perfil, vínculos com pacientes, convites pendentes,
          mensagens e recomendações. Os pacientes mantêm os próprios dados (refeições,
          progresso) — apenas o vínculo com você é removido.
        </p>
        <Button
          variant="destructive"
          className="justify-start rounded-xl bg-red-500/90 text-white hover:bg-red-500"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir minha conta
        </Button>
      </Card>

      <Dialog open={open} onOpenChange={(v) => !deleting && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir conta de nutricionista</DialogTitle>
            <DialogDescription>
              Esta ação é <b>permanente e imediata</b>. Você perderá acesso ao painel,
              todos os seus pacientes ficarão sem nutri vinculado, e convites pendentes
              serão cancelados. Não conseguiremos recuperar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-sm">
              Para confirmar, digite <b>EXCLUIR</b> abaixo:
            </Label>
            <Input
              autoFocus
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="EXCLUIR"
              className="mt-2"
              disabled={deleting}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || confirm !== "EXCLUIR"}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
