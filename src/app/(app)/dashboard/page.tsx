"use client";

import { ScoreCircle } from "@/components/score-circle";
import { MacroBadge } from "@/components/macro-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Camera,
  TrendingUp,
  Flame,
  ArrowRight,
  Leaf,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";

// Mock data
const mockData = {
  streak: { current: 5, longest: 12 },
  dailyScore: 72,
  lastMeal: {
    name: "Salmon & Quinoa Bowl",
    score: 92,
    time: "12:30 PM",
    macros: { cal: 613, protein: 50, carbs: 52, fat: 24 },
  },
  weeklyScores: [
    { day: "Mon", score: 65 },
    { day: "Tue", score: 70 },
    { day: "Wed", score: 58 },
    { day: "Thu", score: 75 },
    { day: "Fri", score: 72 },
  ],
  recommendations: [
    {
      id: "1",
      content:
        "You've had two high-sugar-impact meals today. Walk for 10 minutes after your next meal — it cuts glycemic response by up to 30%.",
      type: "daily_challenge",
    },
    {
      id: "2",
      content:
        "Add 3 new plant types today — try swapping your usual snack for mixed nuts and an apple.",
      type: "food_swap",
    },
  ],
};

export default function DashboardPage() {
  return (
    <div className="page-enter min-h-screen bg-[#faf8f4] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header with Streak */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl text-[#1a3a2a]">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-[#1a3a2a]/60">
              Here&apos;s your nutrition snapshot for today
            </p>
          </div>
          <div className="glass-card flex items-center gap-3 rounded-2xl px-6 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d4520a]/10">
              <Flame className="h-5 w-5 text-[#d4520a]" />
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1">
                <span className="font-display text-3xl text-[#1a3a2a]">
                  {mockData.streak.current}
                </span>
                <span className="text-sm text-[#1a3a2a]/50">day streak</span>
              </div>
              <p className="text-xs text-[#1a3a2a]/40">
                Best: {mockData.streak.longest} days
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Daily Score - Takes 2 columns on large screens */}
          <Card className="flex flex-col items-center justify-center space-y-6 rounded-3xl border-0 bg-white p-10 shadow-lg ring-1 ring-black/[0.04] lg:col-span-2">
            <div className="text-center">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1a3a2a]/50">
                Today&apos;s Score
              </h2>
              <p className="mt-1 text-sm text-[#1a3a2a]/40">
                Based on your meals so far
              </p>
            </div>
            <ScoreCircle score={mockData.dailyScore} size={200} />
            <p className="max-w-xs text-center text-sm leading-relaxed text-[#1a3a2a]/60">
              {mockData.dailyScore >= 80
                ? "Excellent work! Keep it up."
                : mockData.dailyScore >= 60
                ? "Good progress. A few tweaks could push you past 80."
                : "Room to improve. Check recommendations below."}
            </p>
          </Card>

          {/* Last Meal Logged */}
          <Card className="group rounded-3xl border-0 bg-white p-6 shadow-lg ring-1 ring-black/[0.04] transition-all hover:shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1a3a2a]/50">
                Last Meal
              </h3>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a3a2a] text-xs font-bold text-white">
                {mockData.lastMeal.score}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-display text-xl text-[#1a3a2a]">
                  {mockData.lastMeal.name}
                </h4>
                <p className="mt-1 text-xs text-[#1a3a2a]/40">
                  {mockData.lastMeal.time}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MacroBadge
                  label="Cal"
                  value={mockData.lastMeal.macros.cal}
                  unit="kcal"
                />
                <MacroBadge
                  label="Protein"
                  value={mockData.lastMeal.macros.protein}
                  unit="g"
                  color="#1a3a2a"
                />
                <MacroBadge
                  label="Carbs"
                  value={mockData.lastMeal.macros.carbs}
                  unit="g"
                  color="#d4520a"
                />
                <MacroBadge
                  label="Fat"
                  value={mockData.lastMeal.macros.fat}
                  unit="g"
                  color="#6366f1"
                />
              </div>
              <Link href="/log" className="block">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-[#1a3a2a] hover:bg-[#1a3a2a]/5"
                >
                  View Details
                  <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Weekly Trend */}
        <Card className="rounded-3xl border-0 bg-white p-8 shadow-lg ring-1 ring-black/[0.04]">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a3a2a]/5">
                <TrendingUp className="h-5 w-5 text-[#1a3a2a]" />
              </div>
              <div>
                <h3 className="font-display text-lg text-[#1a3a2a]">
                  Weekly Trend
                </h3>
                <p className="text-xs text-[#1a3a2a]/40">Your score over time</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-[#1a3a2a]/15 bg-[#1a3a2a]/5 text-[#1a3a2a]"
            >
              <Sparkles className="mr-1.5 h-3 w-3" />
              +7 pts this week
            </Badge>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockData.weeklyScores}>
                <defs>
                  <linearGradient id="dashGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a3a2a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1a3a2a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e2da" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#1a3a2a", opacity: 0.4, fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#1a3a2a", opacity: 0.3, fontSize: 11 }}
                  domain={[40, 100]}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e7e2da",
                    borderRadius: "12px",
                    boxShadow: "0 8px 32px -4px rgb(0 0 0 / 0.08)",
                    fontSize: "13px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#1a3a2a"
                  strokeWidth={2.5}
                  fill="url(#dashGradient)"
                  dot={{ fill: "#1a3a2a", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: "#1a3a2a", strokeWidth: 2, stroke: "white" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Personalized Insights */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4520a]/10">
              <Leaf className="h-5 w-5 text-[#d4520a]" />
            </div>
            <div>
              <h3 className="font-display text-lg text-[#1a3a2a]">
                Personalized Insights
              </h3>
              <p className="text-xs text-[#1a3a2a]/40">
                AI-powered recommendations for you
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {mockData.recommendations.map((rec) => (
              <Card
                key={rec.id}
                className="group relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-white to-[#1a3a2a]/[0.03] p-6 shadow-md ring-1 ring-[#1a3a2a]/[0.06] transition-all hover:shadow-lg"
              >
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d4520a]/10">
                    <Lightbulb className="h-5 w-5 text-[#d4520a]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed text-[#1a3a2a]/80">
                      {rec.content}
                    </p>
                    <Badge
                      variant="outline"
                      className="mt-3 border-[#1a3a2a]/10 bg-[#1a3a2a]/[0.03] text-xs text-[#1a3a2a]/60"
                    >
                      {rec.type === "daily_challenge"
                        ? "Daily Challenge"
                        : "Food Swap"}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-2">
          <Link href="/log" className="block">
            <Button
              size="lg"
              className="group w-full rounded-2xl bg-[#1a3a2a] py-7 text-lg font-semibold text-white shadow-lg shadow-[#1a3a2a]/20 transition-all hover:bg-[#1a3a2a]/90 hover:shadow-xl hover:shadow-[#1a3a2a]/25"
            >
              <Camera className="mr-3 h-5 w-5" />
              Log Your Next Meal
              <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
