"use client"

import { Badge } from "@/components/ui/badge"
import { TrendingUp, Sparkles } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts"

interface WeeklyScore {
  day: string
  score: number | null
}

export function DashboardCharts({ weeklyScores }: { weeklyScores: WeeklyScore[] }) {
  const scores = weeklyScores.filter(s => s.score !== null).map(s => s.score as number)
  const trend = scores.length >= 2
    ? (scores[scores.length - 1] - scores[0])
    : null

  return (
    <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#1a3a2a]/5 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-[#1a3a2a]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1a3a2a]">Tendência</p>
            <p className="text-[10px] text-[#1a3a2a]/60">Últimos 7 dias</p>
          </div>
        </div>
        {trend !== null && (
          <Badge variant="outline" className="border-[#1a3a2a]/10 bg-[#1a3a2a]/5 text-[#1a3a2a]/70 text-xs rounded-full">
            <Sparkles className="mr-1 h-2.5 w-2.5" />
            {trend >= 0 ? '+' : ''}{trend} pts
          </Badge>
        )}
      </div>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weeklyScores} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a3a2a" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1a3a2a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4ddd4" vertical={false} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#1a3a2a", opacity: 0.35, fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#1a3a2a", opacity: 0.25, fontSize: 10 }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: "white", border: "1px solid #e4ddd4", borderRadius: "12px", fontSize: "13px", boxShadow: "0 8px 24px -4px rgba(0,0,0,0.08)" }}
              cursor={{ stroke: "#1a3a2a", strokeWidth: 1, strokeOpacity: 0.1 }}
            />
            <Area type="monotone" dataKey="score" stroke="#1a3a2a" strokeWidth={2} fill="url(#grad)"
              dot={{ fill: "#1a3a2a", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: "#1a3a2a", stroke: "white", strokeWidth: 2 }}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
