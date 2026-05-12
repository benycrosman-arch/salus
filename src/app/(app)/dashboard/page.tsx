import Link from "next/link"
import { Camera, ArrowRight, Flame, TrendingUp, Leaf, Lightbulb, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getLocale, getTranslations } from "next-intl/server"
import { DashboardCharts } from "./dashboard-client"
import { DashboardEngagement } from "./dashboard-engagement"
import { HydrationQuickLog } from "./hydration-quick-log"
import { PatientRealtimeRefresher } from "./patient-realtime-refresher"
import { MicronutrientPanel } from "@/components/dashboard/micronutrient-panel"
import { NutriGuidanceCard } from "@/components/dashboard/nutri-guidance-card"
import { calculateGoals } from "@/lib/goals"
import type { UserGoalProfile } from "@/lib/goals"

type WearableRow = {
  metric: string
  value: number | null
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return values.reduce((sum, n) => sum + n, 0) / values.length
}

function extractWearableSignals(rows: WearableRow[]) {
  const activeCaloriesValues: number[] = []
  const exerciseMinuteValues: number[] = []
  const sleepHourValues: number[] = []

  for (const row of rows) {
    if (typeof row.value !== "number" || Number.isNaN(row.value)) continue
    const metric = row.metric.toLowerCase()
    if (metric.includes("active_calories") || metric.includes("calories_active") || metric.includes("calorias_ativas")) {
      activeCaloriesValues.push(row.value)
    } else if (metric.includes("exercise_minutes") || metric.includes("workout_minutes") || metric.includes("minutos_exercicio")) {
      exerciseMinuteValues.push(row.value)
    } else if (metric.includes("sleep_hours") || metric.includes("sono_horas") || metric.includes("sleep_duration_hours")) {
      sleepHourValues.push(row.value)
    }
  }

  return {
    active_calories_kcal: average(activeCaloriesValues),
    exercise_minutes: average(exerciseMinuteValues),
    sleep_hours: average(sleepHourValues),
  }
}

// Hydration is a running daily total — sum (not average) every entry whose
// metric label is one of the known fluid-intake keys. Apple Health emits
// "dietary_water" in liters; we coerce to ml.
function isHydrationMetric(metric: string): boolean {
  const m = metric.toLowerCase()
  return (
    m.includes("water_ml") ||
    m.includes("water_intake") ||
    m.includes("hydration") ||
    m.includes("dietary_water") ||
    m.includes("fluid_ml") ||
    m.includes("agua_ml") ||
    m.includes("hidratacao")
  )
}

function sumHydrationMl(rows: WearableRow[]): number {
  let total = 0
  for (const row of rows) {
    if (typeof row.value !== "number" || Number.isNaN(row.value)) continue
    if (!isHydrationMetric(row.metric)) continue
    // dietary_water arrives in liters — anything ≤ 30 is almost certainly L.
    const ml = row.value <= 30 ? row.value * 1000 : row.value
    total += ml
  }
  return Math.round(total)
}

// ─── Server data fetch ────────────────────────────────────────────────────────
async function getDashboardData() {
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

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]

  const [profileRes, streakRes, todayMealsRes, weekStatsRes, prefsRes, labsRes, wearableRes, todayHydrationRes] = await Promise.all([
    supabase.from('profiles').select('name, age, biological_sex, height_cm, weight_kg, activity_level, ai_daily_goals, ai_goals_generated_at').eq('id', user.id).single(),
    supabase.from('streaks').select('current_streak, longest_streak').eq('user_id', user.id).single(),
    supabase.from('meals').select('macros, score, meal_type, logged_at').eq('user_id', user.id).gte('logged_at', `${today}T00:00:00`).order('logged_at', { ascending: false }),
    supabase.from('daily_stats').select('date, avg_score').eq('user_id', user.id).gte('date', sevenDaysAgo).order('date', { ascending: true }),
    supabase.from('user_preferences').select('goals, diet_type').eq('user_id', user.id).single(),
    supabase.from('lab_results').select('marker, value').eq('user_id', user.id).order('measured_at', { ascending: false }),
    supabase.from("wearable_data").select("metric, value").eq("user_id", user.id).gte("recorded_at", `${sevenDaysAgo}T00:00:00`),
    supabase.from("wearable_data").select("metric, value").eq("user_id", user.id).gte("recorded_at", `${today}T00:00:00`),
  ])

  const profile = profileRes.data
  const streak = streakRes.data
  const todayMeals = todayMealsRes.data ?? []
  const weekStats = weekStatsRes.data ?? []
  const goals = prefsRes.data?.goals ?? []
  const dietType = prefsRes.data?.diet_type as UserGoalProfile['diet_type'] | undefined
  const labs = labsRes.data ?? []
  const wearableSignals = extractWearableSignals((wearableRes.data ?? []) as WearableRow[])
  const hasWearableSignals =
    wearableSignals.active_calories_kcal !== undefined ||
    wearableSignals.exercise_minutes !== undefined ||
    wearableSignals.sleep_hours !== undefined
  const todayHydrationMl = sumHydrationMl((todayHydrationRes.data ?? []) as WearableRow[])

  // Compute today's macro totals
  const todayTotals = todayMeals.reduce(
    (acc, m) => {
      const mac = m.macros as Record<string, number>
      return {
        calories: acc.calories + (mac?.calories ?? 0),
        protein: acc.protein + (mac?.protein ?? 0),
        carbs: acc.carbs + (mac?.carbs ?? 0),
        fat: acc.fat + (mac?.fat ?? 0),
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const todayAvgScore = todayMeals.length
    ? Math.round(todayMeals.reduce((a, m) => a + m.score, 0) / todayMeals.length)
    : null

  const lastMeal = todayMeals[0] ?? null

  // Daily goals:
  // 1) If wearable has recent data, prioritize adaptive profile+wearable goals.
  // 2) Else prefer AI-personalized goals.
  // 3) Else deterministic Mifflin-St Jeor.
  let dailyGoals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; water_ml: number; protein_per_kg?: number } =
    { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 67, fiber_g: 25, water_ml: 2500 }
  let goalsSource: 'ai' | 'mifflin' | 'default' | 'adaptive_wearable' = 'default'
  let goalsRationale: string | null = null
  let priorityMicros: string[] = []
  let goalHabits: string[] = []
  let goalFlags: string[] = []

  const aiGoals = profile?.ai_daily_goals as {
    kcal?: number; protein_g?: number; carbs_g?: number; fat_g?: number; fiber_g?: number; water_ml?: number
    rationale?: string; priority_micros?: string[]; habits?: string[]; flags?: string[]
  } | null

  if (profile?.age && profile?.biological_sex && profile?.height_cm && profile?.weight_kg && profile?.activity_level && hasWearableSignals) {
    const hba1cEntry = labs.find(l => l.marker === 'HbA1c')
    const glucoseEntry = labs.find(l => l.marker === 'Glicose em jejum')
    const goalProfile: UserGoalProfile = {
      age: profile.age,
      biological_sex: profile.biological_sex as UserGoalProfile['biological_sex'],
      height_cm: profile.height_cm,
      weight_kg: parseFloat(profile.weight_kg),
      activity_level: profile.activity_level as UserGoalProfile['activity_level'],
      goals,
      diet_type: dietType,
      hba1c: hba1cEntry?.value,
      glucose: glucoseEntry?.value,
      wearable: wearableSignals,
    }
    const computed = calculateGoals(goalProfile)
    dailyGoals = computed
    goalsRationale = computed.rationale
    goalsSource = 'adaptive_wearable'
  } else if (aiGoals && typeof aiGoals.kcal === 'number') {
    dailyGoals = {
      kcal: aiGoals.kcal,
      protein_g: aiGoals.protein_g ?? 150,
      carbs_g: aiGoals.carbs_g ?? 200,
      fat_g: aiGoals.fat_g ?? 67,
      fiber_g: aiGoals.fiber_g ?? 25,
      water_ml: aiGoals.water_ml ?? 2500,
    }
    goalsSource = 'ai'
    goalsRationale = aiGoals.rationale ?? null
    priorityMicros = aiGoals.priority_micros ?? []
    goalHabits = aiGoals.habits ?? []
    goalFlags = aiGoals.flags ?? []
  } else if (profile?.age && profile?.biological_sex && profile?.height_cm && profile?.weight_kg && profile?.activity_level) {
    const hba1cEntry = labs.find(l => l.marker === 'HbA1c')
    const glucoseEntry = labs.find(l => l.marker === 'Glicose em jejum')
    const goalProfile: UserGoalProfile = {
      age: profile.age,
      biological_sex: profile.biological_sex as UserGoalProfile['biological_sex'],
      height_cm: profile.height_cm,
      weight_kg: parseFloat(profile.weight_kg),
      activity_level: profile.activity_level as UserGoalProfile['activity_level'],
      goals,
      diet_type: dietType,
      hba1c: hba1cEntry?.value,
      glucose: glucoseEntry?.value,
    }
    const computed = calculateGoals(goalProfile)
    dailyGoals = computed
    goalsRationale = computed.rationale
    goalsSource = 'mifflin'
  }

  const macroPercents = {
    protein: Math.min(100, Math.round((todayTotals.protein / dailyGoals.protein_g) * 100)),
    carbs: Math.min(100, Math.round((todayTotals.carbs / dailyGoals.carbs_g) * 100)),
    fat: Math.min(100, Math.round((todayTotals.fat / dailyGoals.fat_g) * 100)),
  }

  // Week trend — fill missing days with null
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const weeklyScores = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    const dateStr = d.toISOString().split('T')[0]
    const stat = weekStats.find(s => s.date === dateStr)
    return { day: dayLabels[d.getDay()], score: stat?.avg_score ?? null }
  })

  const firstName = profile?.name?.split(' ')[0] ?? null

  const hour = new Date().getHours()
  const greetingKey: 'morning' | 'afternoon' | 'evening' =
    hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

  const profileComplete = Boolean(
    profile?.age &&
    profile?.biological_sex &&
    profile?.height_cm &&
    profile?.weight_kg &&
    profile?.activity_level,
  )

  return {
    firstName,
    greetingKey,
    streak: { current: streak?.current_streak ?? 0, longest: streak?.longest_streak ?? 0 },
    todayScore: todayAvgScore,
    macroPercents,
    todayTotals,
    dailyGoals,
    goalsSource,
    goalsRationale,
    priorityMicros,
    goalHabits,
    goalFlags,
    lastMeal,
    weeklyScores,
    mealsToday: todayMeals.length,
    todayHydrationMl,
    userId: user.id,
    userCreatedAt: user.created_at ?? null,
    aiGoalsGeneratedAt: profile?.ai_goals_generated_at ?? null,
    profileComplete,
  }
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
          <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-[#1a3a2a]">{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-[#1a3a2a]">{label}</p>
        <p className="text-[10px] text-[#1a3a2a]/60">{sublabel}</p>
      </div>
    </div>
  )
}

function ScorePill({ score, label }: { score: number; label: string }) {
  const color = score >= 85 ? "#1a3a2a" : score >= 65 ? "#4a7c4a" : score >= 45 ? "#c8a538" : "#c4614a"
  return (
    <div className="flex items-center gap-2.5 rounded-full px-4 py-2 ring-1 ring-black/[0.06] bg-white">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r="16" fill="none" stroke="#e4ddd4" strokeWidth="4" />
        <circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 16}`}
          strokeDashoffset={`${2 * Math.PI * 16 * (1 - score / 100)}`} />
      </svg>
      <div>
        <p className="text-xl font-bold text-[#1a3a2a] leading-none">{score}</p>
        <p className="text-[10px] font-medium text-[#1a3a2a]/60 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  const t = await getTranslations('dashboard')
  const locale = await getLocale()

  const youFallback = locale === 'pt' ? 'você' : 'there'
  const firstName = data.firstName ?? youFallback
  const greeting = t(`greeting.${data.greetingKey}` as 'greeting.morning')

  const mealsLine =
    data.mealsToday === 0
      ? t('noMealsToday')
      : data.mealsToday === 1
        ? t('mealsTodayOne')
        : t('mealsTodayMany', { count: data.mealsToday })

  const scoreLabel = (score: number) =>
    score >= 85
      ? t('scoreLabels.excellent')
      : score >= 65
        ? t('scoreLabels.good')
        : score >= 45
          ? t('scoreLabels.regular')
          : t('scoreLabels.attention')

  return (
    <div className="page-enter space-y-8">
      <PatientRealtimeRefresher patientId={data.userId} />
      <DashboardEngagement
        userId={data.userId}
        userCreatedAt={data.userCreatedAt}
        aiGoalsGeneratedAt={data.aiGoalsGeneratedAt}
        profileComplete={data.profileComplete}
      />

      <NutriGuidanceCard userId={data.userId} />

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-4xl italic text-[#1a3a2a]">{greeting}, {firstName}</h1>
          <p className="mt-1 text-sm text-[#1a3a2a]/50">{mealsLine}</p>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl bg-white px-5 py-3 ring-1 ring-black/[0.04]">
          <div className="w-9 h-9 rounded-full bg-[#c4614a]/10 flex items-center justify-center">
            <Flame className="h-4 w-4 text-[#c4614a]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-2xl italic text-[#1a3a2a]">{data.streak.current}</span>
              <span className="text-xs text-[#1a3a2a]/60">{t('streakDays')}</span>
            </div>
            <p className="text-[10px] text-[#1a3a2a]/50 leading-none">{t('streakLabel')}</p>
          </div>
        </div>
      </div>

      {/* ── Three Macro Donuts ──────────────────────────── */}
      <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[#1a3a2a]/60">{t('scoreOfDay')}</p>
            <p className="text-[#1a3a2a]/60 text-xs mt-0.5">{t('scoreSubtitle')}</p>
          </div>
          {data.todayScore !== null
            ? <ScorePill score={data.todayScore} label={scoreLabel(data.todayScore)} />
            : <span className="text-sm text-[#1a3a2a]/50 italic">{t('noMeals')}</span>
          }
        </div>
        <div className="flex justify-around items-start">
          <Donut pct={data.macroPercents.protein} color="#1a3a2a" label={t('macros.protein')} sublabel={t('macros.goal', { value: data.dailyGoals.protein_g, unit: 'g' })} />
          <div className="w-px h-20 bg-[#e4ddd4] self-center" />
          <Donut pct={data.macroPercents.carbs} color="#c4614a" label={t('macros.carbs')} sublabel={t('macros.goal', { value: data.dailyGoals.carbs_g, unit: 'g' })} />
          <div className="w-px h-20 bg-[#e4ddd4] self-center" />
          <Donut pct={data.macroPercents.fat} color="#4a7c4a" label={t('macros.fat')} sublabel={t('macros.goal', { value: data.dailyGoals.fat_g, unit: 'g' })} />
        </div>
      </div>

      {/* ── Last Meal + Trend ───────────────────────────── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Last Meal */}
        <div className="rounded-3xl bg-white ring-1 ring-black/[0.04] shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[#1a3a2a]/60">{t('lastMeal')}</p>
            {data.lastMeal && (
              <div className="w-9 h-9 rounded-full bg-[#1a3a2a] flex items-center justify-center">
                <span className="text-xs font-bold text-white">{data.lastMeal.score}</span>
              </div>
            )}
          </div>
          {data.lastMeal ? (
            <>
              <h3 className="font-serif text-2xl italic text-[#1a3a2a]">
                {data.lastMeal.meal_type === 'breakfast' ? t('mealTypes.breakfast')
                  : data.lastMeal.meal_type === 'lunch' ? t('mealTypes.lunch')
                  : data.lastMeal.meal_type === 'dinner' ? t('mealTypes.dinner')
                  : data.lastMeal.meal_type === 'snack1' || data.lastMeal.meal_type === 'snack2' ? t('mealTypes.snack')
                  : t('mealTypes.meal')}
              </h3>
              <p className="text-xs text-[#1a3a2a]/50 mt-0.5">
                {new Date(data.lastMeal.logged_at).toLocaleTimeString(locale === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="grid grid-cols-4 gap-2 mt-5">
                {[
                  { l: "Cal", v: (data.lastMeal.macros as Record<string,number>)?.calories ?? 0, u: "kcal", c: "#1a3a2a" },
                  { l: "Prot", v: (data.lastMeal.macros as Record<string,number>)?.protein ?? 0, u: "g", c: "#1a3a2a" },
                  { l: "Carb", v: (data.lastMeal.macros as Record<string,number>)?.carbs ?? 0, u: "g", c: "#c4614a" },
                  { l: "Gord", v: (data.lastMeal.macros as Record<string,number>)?.fat ?? 0, u: "g", c: "#4a7c4a" },
                ].map(({ l, v, u, c }) => (
                  <div key={l} className="rounded-xl bg-[#f0ebe3] p-2.5 text-center">
                    <p className="text-[9px] font-medium uppercase tracking-wider text-[#1a3a2a]/60">{l}</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: c }}>{Math.round(v)}</p>
                    <p className="text-[9px] text-[#1a3a2a]/50">{u}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="font-serif text-xl italic text-[#1a3a2a]/50">{t('noMealsYet')}</p>
              <p className="text-xs text-[#1a3a2a]/50 mt-1">{t('logFirstMeal')}</p>
            </div>
          )}
          <Link href="/log">
            <Button variant="ghost" size="sm" className="w-full mt-4 text-[#1a3a2a]/50 hover:text-[#1a3a2a] hover:bg-[#1a3a2a]/5 rounded-xl">
              {data.lastMeal ? t('viewDetails') : t('logNow')}
              <ArrowRight className="ml-1.5 h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Weekly Trend — client component for chart */}
        <DashboardCharts weeklyScores={data.weeklyScores} />
      </div>

      {/* ── Micronutrients — client fetched ─────────────── */}
      <MicronutrientPanel />

      {/* ── AI-personalized goals (rationale + habits) ──── */}
      {data.goalsSource === "ai" && (data.goalsRationale || data.goalHabits.length > 0) && (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a3a2a] to-[#2d5240] p-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-[#c4614a]" />
            <p className="text-xs font-semibold tracking-widest uppercase text-white/60">
              {t('personalizedPlan')}
            </p>
          </div>
          {data.goalsRationale && (
            <p className="text-sm leading-relaxed text-white/80 mb-4 font-body">
              {data.goalsRationale}
            </p>
          )}
          {data.goalHabits.length > 0 && (
            <div className="space-y-2">
              {data.goalHabits.map((habit: string, i: number) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#c4614a]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-[#c4614a]">{i + 1}</span>
                  </div>
                  <p className="text-sm text-white/85 leading-relaxed font-body">{habit}</p>
                </div>
              ))}
            </div>
          )}
          {data.goalFlags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-white/10">
              {data.goalFlags.map((flag: string) => (
                <span
                  key={flag}
                  className="text-[10px] uppercase tracking-wider text-white/60 rounded-full bg-white/10 px-2.5 py-0.5"
                >
                  {flag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Daily macro goals ────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#c4614a]/10 flex items-center justify-center">
            <Leaf className="h-4 w-4 text-[#c4614a]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1a3a2a]">{t('todayGoals')}</p>
            <p className="text-[10px] text-[#1a3a2a]/60">
              {data.goalsSource === "adaptive_wearable"
                ? t('goalsSourceAdaptive')
                : data.goalsSource === "ai"
                  ? t('goalsSourceAi')
                  : t('goalsSourceProfile')}
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-white ring-1 ring-black/[0.04] p-5 flex gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1a3a2a]/5 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-4 w-4 text-[#1a3a2a]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a3a2a] mb-1">{t('calories', { kcal: data.dailyGoals.kcal })}</p>
              <p className="text-sm text-[#1a3a2a]/60 leading-relaxed">
                {t('consumedToday', { value: Math.round(data.todayTotals.calories), pct: Math.round(data.todayTotals.calories / data.dailyGoals.kcal * 100) })}
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-white ring-1 ring-black/[0.04] p-5 flex gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#c4614a]/10 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="h-4 w-4 text-[#c4614a]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a3a2a] mb-1">{t('proteinGoal', { value: data.dailyGoals.protein_g })}</p>
              <p className="text-sm text-[#1a3a2a]/60 leading-relaxed">
                {t('consumedTodayG', { value: Math.round(data.todayTotals.protein), pct: data.macroPercents.protein })}
              </p>
            </div>
          </div>
          <HydrationQuickLog
            goalMl={data.dailyGoals.water_ml}
            consumedMl={data.todayHydrationMl}
            emptyLabel={t('hydrationNoData')}
          />
        </div>
      </div>

      {/* ── CTA ─────────────────────────────────────────── */}
      <div className="pb-2">
        <Link href="/log">
          <Button className="group w-full rounded-2xl bg-[#1a3a2a] py-7 text-base font-semibold text-white shadow-lg shadow-[#1a3a2a]/15 transition-all hover:bg-[#1a3a2a]/90 hover:shadow-xl active:scale-[0.99]">
            <Camera className="mr-3 h-5 w-5" />
            {t('logNextMeal')}
            <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
