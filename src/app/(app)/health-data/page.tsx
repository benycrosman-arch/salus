"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Watch, Activity, FlaskConical, Dumbbell,
  AlertCircle, HelpCircle, Upload, Plus, ExternalLink
} from "lucide-react"
import { toast } from "sonner"

const devices = [
  { id: "apple_health", name: "Apple Health", icon: "🍎", connected: false, description: "Passos, sono, FC e muito mais" },
  { id: "whoop", name: "WHOOP", icon: "⚡", connected: false, description: "HRV, recuperação e esforço" },
  { id: "oura", name: "Oura Ring", icon: "💍", connected: false, description: "Sono, temperatura e prontidão" },
  { id: "garmin", name: "Garmin", icon: "🏃", connected: false, description: "GPS, treinos e saúde" },
  { id: "fitbit", name: "Fitbit", icon: "📊", connected: false, description: "Atividade, sono e saúde" },
  { id: "strava", name: "Strava", icon: "🚴", connected: false, description: "Corridas, ciclismo e natação" },
]

const labMarkers = [
  { key: "glucose", label: "Glicose em jejum", unit: "mg/dL", ref: "70–99", tooltip: "Mede o açúcar no sangue em jejum" },
  { key: "hba1c", label: "HbA1c", unit: "%", ref: "<5.7", tooltip: "Média do açúcar nos últimos 2-3 meses" },
  { key: "hdl", label: "HDL (colesterol bom)", unit: "mg/dL", ref: ">60", tooltip: "Colesterol bom — protetor cardiovascular" },
  { key: "ldl", label: "LDL (colesterol ruim)", unit: "mg/dL", ref: "<100", tooltip: "Colesterol ruim" },
  { key: "triglycerides", label: "Triglicérides", unit: "mg/dL", ref: "<150", tooltip: "Gorduras circulantes no sangue" },
  { key: "vitaminD", label: "Vitamina D", unit: "ng/mL", ref: "30–100", tooltip: "Fundamental para ossos, imunidade e humor" },
  { key: "ferritin", label: "Ferritina", unit: "ng/mL", ref: "12–300", tooltip: "Reserva de ferro no organismo" },
  { key: "b12", label: "Vitamina B12", unit: "pg/mL", ref: "200–900", tooltip: "Essencial para nervos e produção de glóbulos vermelhos" },
  { key: "tsh", label: "TSH", unit: "mUI/L", ref: "0.4–4.0", tooltip: "Hormônio que controla a tireoide" },
  { key: "uricAcid", label: "Ácido úrico", unit: "mg/dL", ref: "2.4–7.0", tooltip: "Relacionado à gota e saúde metabólica" },
  { key: "crp", label: "PCR (Proteína C-reativa)", unit: "mg/L", ref: "<3.0", tooltip: "Marcador de inflamação sistêmica" },
  { key: "magnesium", label: "Magnésio", unit: "mg/dL", ref: "1.7–2.2", tooltip: "Mineral essencial para centenas de reações no corpo" },
]

type LabValues = Record<string, string>

export default function HealthDataPage() {
  const [labValues, setLabValues] = useState<LabValues>({})

  const handleConnectDevice = (deviceName: string) => {
    toast.info(`Integração com ${deviceName} em breve — clique para entrar na lista de espera`)
  }

  const handleSaveLabs = () => {
    toast.success("Exames salvos com sucesso!")
  }

  const handleWaitlist = () => {
    toast.success("Você entrou na lista de espera das integrações.")
  }

  const handleUploadPdf = () => {
    toast.info("Upload de PDF de exame em breve.")
  }

  const handleAddSession = () => {
    toast.info("Registro manual de sessões em breve.")
  }

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-sans">Dados de Saúde</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">Conecte dispositivos, insira exames e acompanhe seu treino</p>
      </div>

      <Tabs defaultValue="devices">
        <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted p-1 h-11">
          <TabsTrigger value="devices" className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Watch className="w-4 h-4 mr-1.5" />Dispositivos
          </TabsTrigger>
          <TabsTrigger value="labs" className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FlaskConical className="w-4 h-4 mr-1.5" />Exames
          </TabsTrigger>
          <TabsTrigger value="training" className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Dumbbell className="w-4 h-4 mr-1.5" />Treino
          </TabsTrigger>
        </TabsList>

        {/* DEVICES TAB */}
        <TabsContent value="devices" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground font-body">
            Conecte seus wearables para personalizar ainda mais seus scores e recomendações.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {devices.map((device) => (
              <Card key={device.id} className="border-0 shadow-md p-4 flex items-center gap-4">
                <div className="text-3xl">{device.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">{device.name}</p>
                    {device.connected ? (
                      <Badge className="bg-success/10 text-success border-0 text-[10px] rounded-full">Conectado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] rounded-full text-muted-foreground border-border">Em breve</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">{device.description}</p>
                </div>
                <Button size="sm" variant={device.connected ? "outline" : "default"}
                  onClick={() => handleConnectDevice(device.name)}
                  className="rounded-xl text-xs shrink-0">
                  {device.connected ? "Desconectar" : "Conectar"}
                </Button>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-md p-5 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Integrações chegando em breve</p>
                <p className="text-xs text-muted-foreground font-body mt-1 leading-relaxed">
                  Estamos construindo as integrações com Apple Health, WHOOP, Oura e Garmin. Entre na lista de espera para ser o primeiro a testar.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleWaitlist}
                  className="mt-3 rounded-xl text-xs border-primary/30 text-primary hover:bg-primary/5"
                >
                  <ExternalLink className="w-3 h-3 mr-1.5" />
                  Lista de espera
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* LABS TAB */}
        <TabsContent value="labs" className="mt-4 space-y-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleUploadPdf}
              className="rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 flex-1 h-11"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload de PDF de exame
            </Button>
          </div>

          <div className="space-y-3">
            {labMarkers.map((marker) => (
              <Card key={marker.key} className="border-0 shadow-sm p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">{marker.label}</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm max-w-xs font-body">{marker.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-body mt-0.5">Ref: {marker.ref} {marker.unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" step="0.1" placeholder="—"
                    value={labValues[marker.key] || ""}
                    onChange={(e) => setLabValues({ ...labValues, [marker.key]: e.target.value })}
                    className="w-24 h-9 text-sm text-center rounded-xl font-body"
                  />
                  <span className="text-xs text-muted-foreground font-body w-10">{marker.unit}</span>
                </div>
              </Card>
            ))}
          </div>

          <Button onClick={handleSaveLabs} className="w-full h-12 rounded-xl bg-primary font-semibold hover:bg-primary-hover transition-all">
            Salvar exames
          </Button>

          <Card className="border-0 shadow-sm p-4 bg-muted/50 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-info mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground font-body leading-relaxed">
              Seus dados de saúde são privados e criptografados. Usamos apenas para personalizar seus scores e recomendações nutricionais.
            </p>
          </Card>
        </TabsContent>

        {/* TRAINING TAB */}
        <TabsContent value="training" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "VO₂ Máx", value: "—", unit: "mL/kg/min", icon: "🫁" },
              { label: "Frequência cardíaca em repouso", value: "—", unit: "bpm", icon: "❤️" },
              { label: "Carga semanal", value: "—", unit: "min", icon: "⏱️" },
            ].map((metric, i) => (
              <Card key={i} className="border-0 shadow-md p-4 text-center">
                <div className="text-2xl mb-2">{metric.icon}</div>
                <div className="font-sans font-bold text-xl text-foreground">{metric.value}</div>
                <div className="text-xs font-semibold text-foreground mt-0.5">{metric.label}</div>
                <div className="text-[11px] text-muted-foreground font-body">{metric.unit}</div>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Sessões Recentes</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleAddSession}
                className="text-xs text-primary rounded-xl"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />Adicionar
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Dumbbell className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma sessão registrada</p>
              <p className="text-xs text-muted-foreground/70 font-body mt-1">Conecte um wearable ou adicione manualmente</p>
            </div>
          </Card>

          <Card className="border-0 shadow-md p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Agenda Semanal</h2>
            <div className="grid grid-cols-7 gap-1">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground font-body">{day}</span>
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors">
                    <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
