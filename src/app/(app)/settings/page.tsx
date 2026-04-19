"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Bell, Shield, LogOut, ChevronRight,
  Download, Trash2, Crown, Check
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    nudgeHour: "08:00",
    weeklyReport: true,
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const handleExportData = () => {
    toast.info("Exportação de dados em desenvolvimento")
  }

  const handleDeleteAccount = () => {
    toast.error("Para excluir sua conta, entre em contato com suporte@salusnutri.com.br")
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
          <Button className="w-full bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-all h-11">
            <Crown className="w-4 h-4 mr-2 text-accent" />
            Assinar Pro — R$ 59/mês
          </Button>
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
          <button onClick={handleExportData}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors text-left">
            <div className="flex items-center gap-3">
              <Download className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-body text-foreground">Exportar meus dados</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={handleDeleteAccount}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-destructive/5 transition-colors text-left">
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-destructive" />
              <span className="text-sm font-body text-destructive">Excluir minha conta</span>
            </div>
            <ChevronRight className="w-4 h-4 text-destructive/50" />
          </button>
        </div>
      </Card>

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
