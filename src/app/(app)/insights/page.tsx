import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Lightbulb, Activity, Sparkles } from "lucide-react"
import { InsightsCharts } from "./insights-client"

async function getInsightsData() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) => { s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const thirtyDaysAgo = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0]

  const [statsRes, mealsRes, prefsRes] = await Promise.all([
    supabase.from('daily_stats').select('date, avg_score').eq('user_id', user.id).gte('date', thirtyDaysAgo).order('date', { ascending: true }),
    supabase.from('meals').select('macros, score, logged_at, meal_type').eq('user_id', user.id).gte('logged_at', `${thirtyDaysAgo}T00:00:00`).order('logged_at', { ascending: true }),
    supabase.from('user_preferences').select('goals, gut_score').eq('user_id', user.id).single(),
  ])

  const stats = statsRes.data ?? []
  const meals = mealsRes.data ?? []
  const gutScore = prefsRes.data?.gut_score ?? null

  // Build weekly averages (group by week)
  const weeklyMap: Record<string, number[]> = {}
  stats.forEach(s => {
    if (!s.avg_score) return
    const d = new Date(s.date)
    // ISO week key
    const weekNum = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)
    const key = `Sem ${weekNum}`
    if (!weeklyMap[key]) weeklyMap[key] = []
    weeklyMap[key].push(s.avg_score)
  })
  const weeklyScoreData = Object.entries(weeklyMap).map(([week, scores]) => ({
    week,
    score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  }))

  // Score breakdown from meals
  const totalMeals = meals.length
  const avgScore = totalMeals > 0
    ? Math.round(meals.reduce((a, m) => a + m.score, 0) / totalMeals)
    : null

  // Breakfast vs dinner comparison
  const breakfastMeals = meals.filter(m => m.meal_type === 'breakfast')
  const dinnerMeals = meals.filter(m => m.meal_type === 'dinner')
  const avgBreakfast = breakfastMeals.length
    ? Math.round(breakfastMeals.reduce((a, m) => a + m.score, 0) / breakfastMeals.length)
    : null
  const avgDinner = dinnerMeals.length
    ? Math.round(dinnerMeals.reduce((a, m) => a + m.score, 0) / dinnerMeals.length)
    : null

  // Trend: first 5 vs last 5 days
  const first5 = stats.slice(0, 5).filter(s => s.avg_score)
  const last5 = stats.slice(-5).filter(s => s.avg_score)
  const trend = first5.length && last5.length
    ? Math.round(
        last5.reduce((a, s) => a + (s.avg_score ?? 0), 0) / last5.length -
        first5.reduce((a, s) => a + (s.avg_score ?? 0), 0) / first5.length
      )
    : null

  return { weeklyScoreData, avgScore, totalMeals, avgBreakfast, avgDinner, trend, gutScore }
}

export default async function InsightsPage() {
  const { weeklyScoreData, avgScore, totalMeals, avgBreakfast, avgDinner, trend, gutScore } = await getInsightsData()

  const hasData = totalMeals > 0

  return (
    <div className="page-enter space-y-8">
      <div>
        <h1 className="font-serif text-4xl italic text-[#1a3a2a]">Insights</h1>
        <p className="mt-1 text-sm text-[#1a3a2a]/50">
          {hasData ? "Tendências da sua nutrição ao longo do tempo" : "Registre refeições para ver seus insights"}
        </p>
      </div>

      {/* Weekly Score Trend */}
      <Card className="rounded-3xl border-0 bg-white shadow-lg ring-1 ring-black/[0.04]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-serif text-xl italic text-[#1a3a2a]">Tendência semanal</CardTitle>
              <CardDescription className="mt-1 text-[#1a3a2a]/60">
                Média do seu score nos últimos 30 dias
              </CardDescription>
            </div>
            {trend !== null && (
              <Badge variant="outline" className="border-[#1a3a2a]/15 bg-[#1a3a2a]/5 text-[#1a3a2a]">
                <Sparkles className="mr-1.5 h-3 w-3" />
                {trend >= 0 ? '+' : ''}{trend} pts
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {weeklyScoreData.length > 0 ? (
            <InsightsCharts weeklyScoreData={weeklyScoreData} />
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-[#1a3a2a]/50 italic">Sem dados ainda — registre suas refeições!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats summary */}
      {hasData && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Score médio", value: avgScore !== null ? `${avgScore}` : '—', sub: "últimos 30 dias" },
            { label: "Refeições registradas", value: `${totalMeals}`, sub: "últimos 30 dias" },
            { label: "Saúde intestinal", value: gutScore !== null ? `${gutScore}/100` : '—', sub: "seu score inicial" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="rounded-2xl bg-white ring-1 ring-black/[0.04] p-5 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#1a3a2a]/60 mb-2">{label}</p>
              <p className="font-serif text-3xl italic text-[#1a3a2a]">{value}</p>
              <p className="text-xs text-[#1a3a2a]/50 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Insights cards */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c4614a]/10">
            <Lightbulb className="h-5 w-5 text-[#c4614a]" />
          </div>
          <h2 className="font-serif text-2xl italic text-[#1a3a2a]">Descobertas</h2>
        </div>

        {hasData ? (
          <div className="grid gap-4 md:grid-cols-2">
            {avgScore !== null && (
              <Card className="rounded-2xl border-0 bg-white shadow-md ring-1 ring-[#1a3a2a]/[0.06]">
                <CardHeader className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a3a2a]/8">
                    <TrendingUp className="h-5 w-5 text-[#1a3a2a]" />
                  </div>
                  <CardTitle className="text-base leading-tight text-[#1a3a2a]">
                    Score médio: {avgScore} pontos
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-[#1a3a2a]/50">
                    {avgScore >= 75
                      ? "Ótimo trabalho! Você está mantendo uma alimentação consistente e nutritiva."
                      : avgScore >= 55
                      ? "Bom progresso. Pequenos ajustes nas escolhas alimentares podem elevar seu score."
                      : "Há espaço para crescimento. Foque em adicionar mais proteína e fibras às suas refeições."}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {avgBreakfast !== null && avgDinner !== null && (
              <Card className="rounded-2xl border-0 bg-white shadow-md ring-1 ring-[#1a3a2a]/[0.06]">
                <CardHeader className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c4614a]/10">
                    <Activity className="h-5 w-5 text-[#c4614a]" />
                  </div>
                  <CardTitle className="text-base leading-tight text-[#1a3a2a]">
                    {avgBreakfast > avgDinner
                      ? `Café da manhã ${avgBreakfast - avgDinner} pts acima do jantar`
                      : `Jantar ${avgDinner - avgBreakfast} pts acima do café da manhã`}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-[#1a3a2a]/50">
                    {avgBreakfast > avgDinner
                      ? "Seus cafés da manhã são mais nutritivos. Tente replicar essas escolhas no jantar."
                      : "Seus jantares pontuam melhor. Traga essas escolhas para o início do dia também."}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {trend !== null && (
              <Card className="rounded-2xl border-0 bg-white shadow-md ring-1 ring-[#1a3a2a]/[0.06]">
                <CardHeader className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4a7c4a]/10">
                    <Sparkles className="h-5 w-5 text-[#4a7c4a]" />
                  </div>
                  <CardTitle className="text-base leading-tight text-[#1a3a2a]">
                    Tendência: {trend >= 0 ? `+${trend}` : trend} pts em 30 dias
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-[#1a3a2a]/50">
                    {trend > 5
                      ? "Excelente evolução! Suas escolhas alimentares estão melhorando consistentemente."
                      : trend >= 0
                      ? "Você está mantendo seu nível. Continue assim!"
                      : "Houve uma queda recente. Tente registrar todas as refeições para ter um panorama completo."}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        ) : (
          <Card className="rounded-3xl border-0 bg-white shadow-md ring-1 ring-black/[0.04] p-10 text-center">
            <Lightbulb className="h-12 w-12 text-[#1a3a2a]/15 mx-auto mb-4" />
            <p className="font-serif text-xl italic text-[#1a3a2a]/60">Ainda sem dados suficientes</p>
            <p className="text-sm text-[#1a3a2a]/50 mt-2">
              Registre pelo menos 3 refeições para começar a ver seus insights personalizados.
            </p>
          </Card>
        )}
      </div>

      {/* Biomarker correlation card */}
      {hasData && (
        <Card className="rounded-3xl border-0 bg-gradient-to-br from-[#1a3a2a] to-[#0f2318] shadow-xl text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="font-serif text-xl italic text-white">Padrões identificados</CardTitle>
                <CardDescription className="text-white/50">
                  Com base nas suas {totalMeals} refeições registradas
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm ring-1 ring-white/10">
              <p className="text-lg font-medium leading-relaxed text-white">
                Continue registrando suas refeições — com mais dados, a IA identifica correlações entre sua alimentação, energia e bem-estar.
              </p>
              <p className="mt-2 text-sm text-white/50">
                Refeições analisadas: {totalMeals}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
