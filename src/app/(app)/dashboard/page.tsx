"use client"

import Link from "next/link"
import { Camera, ArrowRight, Flame, TrendingUp, Zap, Leaf, Lightbulb, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts"

// ─── Mock data ───────────────────────────────────────────────────────────────
const mock = {
  streak: { current: 5, longest: 12 },
  dailyScore: 72,
  macros: { protein: 78, carbs: 56, fat: 61 },
  lastMeal: {
    name: "Salmão + Greens",
    score: 96,
    time: "12:30",
    cal: 580,
    protein: 48,
    carbs: 32,
    fat: 22,
  },
  weeklyScores: [
    { day: "Seg", score: 65 },
    { day: "Ter", score: 70 },
    { day: "Qua", score: 58 },
    { day: "Qui", score: 75 },
    { day: "Sex", score: 72 },
  ],
  insights: [
    {
      id: "1",
      content: "Você teve dois pratos com alto impacto glicêmico hoje. Caminhe 10 minutos após a próxima refeição — reduz a resposta glicêmica em até 30%.",
      type: "daily_challenge",
    },
    {
      id: "2",
      content: "Adicione 3 tipos de plantas hoje — troque o snack habitual por castanhas mistas e uma maçã.",
      type: "food_swap",
    },
  ],
}

// ─── Donut SVG ────────────────────────────────────────────────────────────────
function Donut({ pct, color, label, sublabel }: { pct: number; color: string; label: string; sublabel: string }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
          <circle cx="44" cy="44" r={r} fill="none" stroke="#e4ddd4" strokeWidth="7" />
          <circle
            cx="44" cy="44" r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-[#1a3a2a]">{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-[#1a3a2a]">{label}</p>
        <p className="text-[10px] text-[#1a3a2a]/40">{sublabel}</p>
      </div>
    </div>
  )
}

// ─── Score pill ───────────────────────────────────────────────────────────────
function ScorePill({ score }: { score: number }) {
  const color =
    score >= 85 ? "#1a3a2a" :
    score >= 65 ? "#4a7c4a" :
    score >= 45 ? "#c8a538" : "#c4614a"
  const label =
    score >= 85 ? "Excelente" :
    score >= 65 ? "Bom" :
    score >= 45 ? "Regular" : "Atenção"
  return (
    <div className="flex items-center gap-2.5 rounded-full px-4 py-2 ring-1 ring-black/[0.06] bg-white">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r="16" fill="none" stroke="#e4ddd4" strokeWidth="4" />
        <circle
          cx="20" cy="20" r="16"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 16}`}
          strokeDashoffset={`${2 * Math.PI * 16 * (1 - score / 100)}`}
        />
      </svg>
      <div>
        <p className="text-xl font-bold text-[#1a3a2a] leading-none">{score}</p>
        <p className="text-[10px] font-medium text-[#1a3a2a]/40 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="page-enter space-y-8">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-4xl italic text-[#1a3a2a]">Bom dia</h1>
          <p className="mt-1 text-sm text-[#1a3a2a]/50">Seu dia em três números</p>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl bg-white px-5 py-3 ring-1 ring-black/[0.04]">
          <div className="w-9 h-9 rounded-full bg-[#c4614a]/10 flex items-center justify-center">
            <Flame className="h-4.5 w-4.5 text-[#c4614a]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-2xl italic text-[#1a3a2a]">{mock.streak.current}</span>
              <span className="text-xs text-[#1a3a2a]/40">dias</span>
            </div>
            <p className="text-[10px] text-[#1a3a2a]/30 leading-none">sequência</p>
          </div>
        </div>
      </div>

      {/* ── Three Macro Donuts ──────────────────────────── */}
      <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[#1a3a2a]/40">Score do dia</p>
            <p className="text-[#1a3a2a]/40 text-xs mt-0.5">Baseado nas refeições de hoje</p>
          </div>
          <ScorePill score={mock.dailyScore} />
        </div>
        <div className="flex justify-around items-start">
          <Donut pct={mock.macros.protein} color="#1a3a2a" label="Proteína" sublabel="Meta diária" />
          <div className="w-px h-20 bg-[#e4ddd4] self-center" />
          <Donut pct={mock.macros.carbs} color="#c4614a" label="Carboidratos" sublabel="Meta diária" />
          <div className="w-px h-20 bg-[#e4ddd4] self-center" />
          <Donut pct={mock.macros.fat} color="#4a7c4a" label="Gordura" sublabel="Meta diária" />
        </div>
      </div>

      {/* ── Last Meal + Trend ───────────────────────────── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Last Meal */}
        <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[#1a3a2a]/40">Última Refeição</p>
            <div className="w-9 h-9 rounded-full bg-[#1a3a2a] flex items-center justify-center">
              <span className="text-xs font-bold text-white">{mock.lastMeal.score}</span>
            </div>
          </div>
          <h3 className="font-serif text-2xl italic text-[#1a3a2a]">{mock.lastMeal.name}</h3>
          <p className="text-xs text-[#1a3a2a]/30 mt-0.5">{mock.lastMeal.time}</p>

          <div className="grid grid-cols-4 gap-2 mt-5">
            {[
              { l: "Cal", v: mock.lastMeal.cal, u: "kcal", c: "#1a3a2a" },
              { l: "Prot", v: mock.lastMeal.protein, u: "g", c: "#1a3a2a" },
              { l: "Carb", v: mock.lastMeal.carbs, u: "g", c: "#c4614a" },
              { l: "Gord", v: mock.lastMeal.fat, u: "g", c: "#4a7c4a" },
            ].map(({ l, v, u, c }) => (
              <div key={l} className="rounded-xl bg-[#f0ebe3] p-2.5 text-center">
                <p className="text-[9px] font-medium uppercase tracking-wider text-[#1a3a2a]/40">{l}</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: c }}>{v}</p>
                <p className="text-[9px] text-[#1a3a2a]/30">{u}</p>
              </div>
            ))}
          </div>

          <Link href="/log">
            <Button variant="ghost" size="sm" className="w-full mt-4 text-[#1a3a2a]/50 hover:text-[#1a3a2a] hover:bg-[#1a3a2a]/5 rounded-xl">
              Ver detalhes
              <ArrowRight className="ml-1.5 h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Weekly Trend */}
        <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#1a3a2a]/5 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-[#1a3a2a]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1a3a2a]">Tendência</p>
                <p className="text-[10px] text-[#1a3a2a]/40">Últimos 5 dias</p>
              </div>
            </div>
            <Badge variant="outline" className="border-[#1a3a2a]/10 bg-[#1a3a2a]/5 text-[#1a3a2a]/70 text-xs rounded-full">
              <Sparkles className="mr-1 h-2.5 w-2.5" />
              +7 pts
            </Badge>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mock.weeklyScores} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a3a2a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1a3a2a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4ddd4" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#1a3a2a", opacity: 0.35, fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#1a3a2a", opacity: 0.25, fontSize: 10 }} domain={[40, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "white", border: "1px solid #e4ddd4", borderRadius: "12px", fontSize: "13px", boxShadow: "0 8px 24px -4px rgba(0,0,0,0.08)" }}
                  cursor={{ stroke: "#1a3a2a", strokeWidth: 1, strokeOpacity: 0.1 }}
                />
                <Area type="monotone" dataKey="score" stroke="#1a3a2a" strokeWidth={2} fill="url(#grad)" dot={{ fill: "#1a3a2a", strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: "#1a3a2a", stroke: "white", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── AI Insights ─────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#c4614a]/10 flex items-center justify-center">
            <Leaf className="h-4 w-4 text-[#c4614a]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1a3a2a]">Insights personalizados</p>
            <p className="text-[10px] text-[#1a3a2a]/40">Recomendações da IA para você</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {mock.insights.map((rec) => (
            <div key={rec.id} className="rounded-2xl bg-white ring-1 ring-black/[0.04] p-5 flex gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#c4614a]/10 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="h-4.5 w-4.5 text-[#c4614a]" />
              </div>
              <div>
                <p className="text-sm text-[#1a3a2a]/75 leading-relaxed">{rec.content}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#1a3a2a]/40">
                  <Zap className="h-2.5 w-2.5" />
                  {rec.type === "daily_challenge" ? "Desafio do dia" : "Troca inteligente"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ─────────────────────────────────────────── */}
      <div className="pb-2">
        <Link href="/log">
          <Button className="group w-full rounded-2xl bg-[#1a3a2a] py-7 text-base font-semibold text-white shadow-lg shadow-[#1a3a2a]/15 transition-all hover:bg-[#1a3a2a]/90 hover:shadow-xl active:scale-[0.99]">
            <Camera className="mr-3 h-5 w-5" />
            Registrar próxima refeição
            <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
