"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { TrendingUp, Flame, Camera, Star, Target } from "lucide-react"

const weeklyData = [
  { day: "Seg", score: 65 }, { day: "Ter", score: 70 }, { day: "Qua", score: 58 },
  { day: "Qui", score: 75 }, { day: "Sex", score: 72 }, { day: "Sáb", score: 80 }, { day: "Dom", score: 77 },
]

const monthlyData = [
  { week: "Sem 1", score: 61 }, { week: "Sem 2", score: 67 }, { week: "Sem 3", score: 72 }, { week: "Sem 4", score: 76 },
]

const victories = [
  { icon: "🥦", text: "Atingiu 30 tipos diferentes de plantas em uma semana" },
  { icon: "🔥", text: "Manteve sequência de 12 dias — recorde pessoal!" },
  { icon: "📉", text: "Score médio subiu 15 pontos este mês" },
]

const weekFocus = [
  "Adicionar mais proteína no café da manhã — sua média está em 12g (meta: 25g)",
  "Reduzir o índice glicêmico do jantar — troque o arroz branco por integral",
  "Experimente iogurte de kefir como lanche — vai bem no seu perfil intestinal",
]

export default function ProgressPage() {
  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-sans">Progresso</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">Sua evolução nutricional ao longo do tempo</p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: TrendingUp, label: "Score médio", value: "74", sub: "+13 vs mês anterior", color: "text-primary" },
          { icon: Flame, label: "Maior sequência", value: "12", sub: "dias consecutivos", color: "text-accent" },
          { icon: Camera, label: "Refeições logadas", value: "89", sub: "este mês", color: "text-info" },
          { icon: Star, label: "Refeições acima 80", value: "34", sub: "38% do total", color: "text-success" },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i} className="border-0 shadow-md p-4">
              <Icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <div className="font-sans font-bold text-2xl text-foreground">{stat.value}</div>
              <div className="text-xs font-semibold text-foreground mt-0.5">{stat.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-body">{stat.sub}</div>
            </Card>
          )
        })}
      </div>

      {/* Weekly trend */}
      <Card className="border-0 shadow-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Esta Semana</h2>
          <Badge variant="outline" className="text-xs font-body border-primary/20 text-primary">+7 pts</Badge>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 0, left: -30 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4a6b4a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4a6b4a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#8a8a85", fontSize: 11 }} />
              <YAxis domain={[40, 100]} axisLine={false} tickLine={false} tick={{ fill: "#8a8a85", fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e6e0d4", fontFamily: "var(--font-body)" }} formatter={(v) => [`${v}`, "Score"]} />
              <Area type="monotone" dataKey="score" stroke="#4a6b4a" strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ fill: "#4a6b4a", r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Monthly trend */}
      <Card className="border-0 shadow-md p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Últimas 4 Semanas</h2>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: -30 }}>
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#8a8a85", fontSize: 11 }} />
              <YAxis domain={[40, 100]} axisLine={false} tickLine={false} tick={{ fill: "#8a8a85", fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e6e0d4", fontFamily: "var(--font-body)" }} formatter={(v) => [`${v}`, "Score médio"]} />
              <Bar dataKey="score" fill="#4a6b4a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Victories */}
      <Card className="border-0 shadow-md p-5">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Suas Conquistas</h2>
        </div>
        <div className="space-y-3">
          {victories.map((v, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
              <span className="text-xl">{v.icon}</span>
              <p className="text-sm text-foreground font-body leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Week focus */}
      <Card className="border-0 shadow-md p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Focos desta Semana</h2>
          <Badge className="ml-auto bg-primary/10 text-primary border-0 text-xs rounded-full">IA</Badge>
        </div>
        <div className="space-y-3">
          {weekFocus.map((focus, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary">{i + 1}</span>
              </div>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">{focus}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
