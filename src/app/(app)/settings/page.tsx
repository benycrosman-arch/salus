"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Bell, Shield, LogOut, ChevronRight, Globe,
  Download, Trash2, Crown, Check, Apple, Smartphone, Loader2
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { resetIdentity, track } from "@/lib/posthog"
import { useTranslations } from "next-intl"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const tSettings = useTranslations('settings')
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    nudgeHour: "08:00",
    weeklyReport: true,
  })
  const [exporting, setExporting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)

  const handleLogout = async () => {
    track("logout")
    resetIdentity()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/user/export")
      if (!res.ok) {
        toast.error("Não foi possível exportar seus dados.")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `salus-data-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      track("data_exported")
      toast.success("Seus dados foram baixados.")
    } catch (err) {
      console.error(err)
      toast.error("Erro ao exportar dados.")
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "EXCLUIR") return
    setDeleting(true)
    try {
      const res = await fetch("/api/user/delete", { method: "POST" })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error || "Não foi possível excluir a conta.")
        return
      }
      track("account_deleted")
      resetIdentity()
      toast.success("Conta excluída. Adeus.")
      router.push("/")
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error("Erro ao excluir a conta.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-sans">Configurações</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">Gerencie sua assinatura, notificações e privacidade</p>
      </div>

      {/* Subscription */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-[#3d5a3d] p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-accent" />
              <span className="font-semibold">Plano Gratuito</span>
            </div>
            <Badge className="bg-white/20 text-white border-0 text-xs rounded-full">Ativo</Badge>
          </div>
          <p className="text-white/80 text-sm font-body mb-4">
            Faça upgrade para Pro e desbloqueie fotos ilimitadas, planos personalizados e insights avançados.
          </p>
          <p className="text-white/70 text-xs font-body mb-3">
            A assinatura é feita no nosso app iOS ou Android.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              asChild
              className="bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-all h-11"
            >
              <a href="#download">
                <Apple className="w-4 h-4 mr-2" />
                iOS
              </a>
            </Button>
            <Button
              asChild
              className="bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-all h-11"
            >
              <a href="#download">
                <Smartphone className="w-4 h-4 mr-2" />
                Android
              </a>
            </Button>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">O que você ganha no Pro</p>
          {["Fotos ilimitadas de refeições", "Planos alimentares personalizados", "Lista de compras automática", "Insights avançados e tendências", "Dados de saúde e wearables"].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-body text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Language */}
      <Card className="border-0 shadow-md p-5">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">{tSettings('language')}</h2>
        </div>
        <p className="text-xs text-muted-foreground font-body mb-4">{tSettings('languageHint')}</p>
        <LanguageSwitcher variant="inline" />
      </Card>

      {/* Notifications */}
      <Card className="border-0 shadow-md p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Notificações</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-body text-sm font-medium">E-mail</Label>
              <p className="text-xs text-muted-foreground font-body">Resumos semanais e lembretes</p>
            </div>
            <Switch checked={notifications.email}
              onCheckedChange={(v) => setNotifications({ ...notifications, email: v })} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-body text-sm font-medium">Notificações push</Label>
              <p className="text-xs text-muted-foreground font-body">Nudges diários de IA</p>
            </div>
            <Switch checked={notifications.push}
              onCheckedChange={(v) => setNotifications({ ...notifications, push: v })} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-body text-sm font-medium">Relatório semanal</Label>
              <p className="text-xs text-muted-foreground font-body">Resumo da sua semana toda segunda</p>
            </div>
            <Switch checked={notifications.weeklyReport}
              onCheckedChange={(v) => setNotifications({ ...notifications, weeklyReport: v })} />
          </div>
        </div>
      </Card>

      {/* Privacy */}
      <Card className="border-0 shadow-md p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Privacidade e Dados</h2>
        </div>
        <div className="space-y-2">
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              {exporting ? (
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm font-body text-foreground">
                {exporting ? "Preparando download..." : "Exportar meus dados"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-destructive/5 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-destructive" />
              <span className="text-sm font-body text-destructive">Excluir minha conta</span>
            </div>
            <ChevronRight className="w-4 h-4 text-destructive/50" />
          </button>
        </div>
      </Card>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir conta</DialogTitle>
            <DialogDescription>
              Esta ação é <b>permanente e imediata</b>. Todos os seus dados — refeições, perfil,
              exames, recomendações — serão removidos. Não conseguiremos recuperar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-sm">
              Para confirmar, digite <b>EXCLUIR</b> abaixo:
            </Label>
            <Input
              autoFocus
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="EXCLUIR"
              className="mt-2"
              disabled={deleting}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirm !== "EXCLUIR"}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout */}
      <Button onClick={handleLogout} variant="outline"
        className="w-full h-12 rounded-xl border-2 border-destructive/20 text-destructive hover:bg-destructive/5 font-medium font-body">
        <LogOut className="w-4 h-4 mr-2" />
        Sair da conta
      </Button>

      <p className="text-center text-xs text-muted-foreground font-body">
        Salus v1.0 · <a href="/privacidade" className="hover:underline">Privacidade</a> · <a href="/termos" className="hover:underline">Termos</a>
      </p>
    </div>
  )
}
