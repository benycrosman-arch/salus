"use client"

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts"

interface WeeklyScore { week: string; score: number }

export function InsightsCharts({ weeklyScoreData }: { weeklyScoreData: WeeklyScore[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={weeklyScoreData}>
          <defs>
            <linearGradient id="insightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a3a2a" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#1a3a2a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e2da" vertical={false} />
          <XAxis dataKey="week" axisLine={false} tickLine={false}
            tick={{ fill: "#1a3a2a", opacity: 0.4, fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false}
            tick={{ fill: "#1a3a2a", opacity: 0.3, fontSize: 11 }} domain={[0, 100]} width={30} />
          <Tooltip contentStyle={{
            backgroundColor: "white", border: "1px solid #e7e2da",
            borderRadius: "12px", boxShadow: "0 8px 32px -4px rgb(0 0 0 / 0.08)",
          }} />
          <Area type="monotone" dataKey="score" stroke="#1a3a2a" strokeWidth={2.5}
            fill="url(#insightGradient)"
            dot={{ fill: "#1a3a2a", strokeWidth: 0, r: 5 }}
            activeDot={{ r: 7, fill: "#1a3a2a", strokeWidth: 2, stroke: "white" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
