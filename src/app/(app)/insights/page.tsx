"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Lightbulb, Activity, Sparkles } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
} from "recharts";

// Mock data
const weeklyScoreData = [
  { week: "Week 1", score: 68 },
  { week: "Week 2", score: 72 },
  { week: "Week 3", score: 71 },
  { week: "Week 4", score: 76 },
];

const scoreBreakdown = [
  { metric: "Fiber Diversity", score: 72, color: "#1a3a2a" },
  { metric: "Glycemic Control", score: 65, color: "#d4520a" },
  { metric: "Whole Food Ratio", score: 80, color: "#22c55e" },
];

const insights = [
  {
    id: 1,
    title: "Fiber diversity improved 18% this week",
    description: "You added 5 new plant types to your diet, bringing your weekly total to 24.",
    icon: TrendingUp,
  },
  {
    id: 2,
    title: "You score 25 points higher when you include leafy greens",
    description: "Meals with spinach, kale, or arugula consistently show better nutrition scores.",
    icon: Lightbulb,
  },
  {
    id: 3,
    title: "Morning meals consistently score higher than evening meals",
    description: "Your breakfast averages 82 while dinner averages 64. Consider front-loading nutrients.",
    icon: Activity,
  },
];

export default function InsightsPage() {
  return (
    <div className="page-enter min-h-screen bg-[#faf8f4] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="font-display text-4xl text-[#1a3a2a]">Insights</h1>
          <p className="text-[#1a3a2a]/50">
            Track your nutrition trends over time
          </p>
        </div>

        {/* Weekly Score Trend */}
        <Card className="rounded-3xl border-0 bg-white shadow-lg ring-1 ring-black/[0.04]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-xl text-[#1a3a2a]">
                  Weekly Score Trend
                </CardTitle>
                <CardDescription className="mt-1 text-[#1a3a2a]/40">
                  Your average nutrition score over the past 4 weeks
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="border-[#1a3a2a]/15 bg-[#1a3a2a]/5 text-[#1a3a2a]"
              >
                <Sparkles className="mr-1.5 h-3 w-3" />
                +8 pts
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
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
                  <XAxis
                    dataKey="week"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#1a3a2a", opacity: 0.4, fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#1a3a2a", opacity: 0.3, fontSize: 11 }}
                    domain={[0, 100]}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e7e2da",
                      borderRadius: "12px",
                      boxShadow: "0 8px 32px -4px rgb(0 0 0 / 0.08)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#1a3a2a"
                    strokeWidth={2.5}
                    fill="url(#insightGradient)"
                    dot={{ fill: "#1a3a2a", strokeWidth: 0, r: 5 }}
                    activeDot={{ r: 7, fill: "#1a3a2a", strokeWidth: 2, stroke: "white" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Score Breakdown */}
        <Card className="rounded-3xl border-0 bg-white shadow-lg ring-1 ring-black/[0.04]">
          <CardHeader>
            <CardTitle className="font-display text-xl text-[#1a3a2a]">
              Score Breakdown
            </CardTitle>
            <CardDescription className="text-[#1a3a2a]/40">
              How you&apos;re performing across key nutrition metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {scoreBreakdown.map((item) => (
              <div key={item.metric} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1a3a2a]">
                    {item.metric}
                  </span>
                  <span className="font-display text-lg" style={{ color: item.color }}>
                    {item.score}%
                  </span>
                </div>
                <Progress
                  value={item.score}
                  className="h-3 rounded-full"
                  style={
                    {
                      "--progress-background": item.color,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Insights */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4520a]/10">
              <Lightbulb className="size-5 text-[#d4520a]" />
            </div>
            <h2 className="font-display text-2xl text-[#1a3a2a]">Top Insights</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {insights.map((insight) => (
              <Card
                key={insight.id}
                className="group rounded-2xl border-0 bg-gradient-to-br from-white to-[#1a3a2a]/[0.03] shadow-md ring-1 ring-[#1a3a2a]/[0.06] hover:shadow-lg transition-all"
              >
                <CardHeader className="space-y-4">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-[#d4520a]/10">
                    <insight.icon className="size-6 text-[#d4520a]" />
                  </div>
                  <CardTitle className="text-base leading-tight text-[#1a3a2a]">
                    {insight.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-[#1a3a2a]/50">
                    {insight.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Biomarker Correlations */}
        <Card className="rounded-3xl border-0 bg-gradient-to-br from-[#1a3a2a] to-[#0f2318] shadow-xl text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Activity className="size-5" />
              </div>
              <div>
                <CardTitle className="font-display text-xl">Biomarker Correlations</CardTitle>
                <CardDescription className="text-white/50">
                  Patterns we&apos;ve discovered in your nutrition data
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm ring-1 ring-white/10">
                <p className="text-lg font-medium leading-relaxed">
                  Meals with 3+ plant types correlate with 30% lower glycemic impact in your data
                </p>
                <p className="mt-2 text-sm text-white/50">
                  This suggests that plant diversity may help stabilize your blood sugar response.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4 ring-1 ring-white/5">
                <span className="text-sm text-white/60">Sample size</span>
                <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                  47 meals analyzed
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
