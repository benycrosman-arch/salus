import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function scoreMeal(kcal: number, protein_g: number, fiber_g: number, fat_g: number, carbs_g: number): number {
  // Simple heuristic score 0–100
  let score = 60

  // Protein bonus (>20g good, >40g great)
  if (protein_g >= 40) score += 15
  else if (protein_g >= 20) score += 8

  // Fiber bonus (>5g good, >10g great)
  if (fiber_g >= 10) score += 10
  else if (fiber_g >= 5) score += 5

  // Calorie penalty for very high or very low meals
  if (kcal > 1200) score -= 10
  else if (kcal < 100) score -= 5

  // High fat penalty
  if (fat_g > 50) score -= 8

  // High carbs penalty
  if (carbs_g > 100) score -= 7

  return Math.max(0, Math.min(100, Math.round(score)))
}

function scoreBand(score: number): string {
  if (score >= 85) return 'excelente'
  if (score >= 70) return 'otimo'
  if (score >= 50) return 'bom'
  if (score >= 30) return 'atencao'
  return 'evitar'
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    items,
    totals,
    meal_type = 'other',
    photo_url = null,
    notes = null,
    ai_analysis = null,
  } = body

  const score = scoreMeal(totals.kcal, totals.protein, totals.fiber, totals.fat, totals.carbs)
  const band = scoreBand(score)
  const today = new Date().toISOString().split('T')[0]

  // Insert meal
  const { data: meal, error: mealError } = await supabase
    .from('meals')
    .insert({
      user_id: user.id,
      photo_url,
      meal_type,
      foods_detected: items ?? null,
      macros: { calories: totals.kcal, protein: totals.protein, carbs: totals.carbs, fat: totals.fat, fiber: totals.fiber },
      score,
      score_band: band,
      ai_analysis: ai_analysis && typeof ai_analysis === 'object' ? ai_analysis : null,
      user_notes: notes,
    })
    .select('id')
    .single()

  if (mealError) {
    return NextResponse.json({ error: mealError.message }, { status: 500 })
  }

  // Upsert daily_stats
  const { data: existing } = await supabase
    .from('daily_stats')
    .select('avg_score, meals_count')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  const prevCount = existing?.meals_count ?? 0
  const prevAvg = existing?.avg_score ?? 0
  const newCount = prevCount + 1
  const newAvg = Math.round((prevAvg * prevCount + score) / newCount)

  await supabase.from('daily_stats').upsert({
    user_id: user.id,
    date: today,
    avg_score: newAvg,
    meals_count: newCount,
    streak_day: true,
  })

  // Update streak
  const { data: streak } = await supabase
    .from('streaks')
    .select('current_streak, longest_streak, last_logged_date')
    .eq('user_id', user.id)
    .single()

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  let current = 1
  let longest = streak?.longest_streak ?? 1

  if (streak?.last_logged_date === today) {
    // Already logged today — don't increment streak
    current = streak.current_streak
  } else if (streak?.last_logged_date === yesterdayStr) {
    current = (streak.current_streak ?? 0) + 1
    if (current > longest) longest = current
  }

  await supabase.from('streaks').upsert({
    user_id: user.id,
    current_streak: current,
    longest_streak: longest,
    last_logged_date: today,
  })

  // is_first_meal lets the client fire `first_meal_logged` exactly once for
  // analytics; computed cheaply with head:true since RLS already restricts to
  // this user's rows.
  const { count: totalMealsCount } = await supabase
    .from('meals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  const isFirstMeal = (totalMealsCount ?? 0) <= 1

  return NextResponse.json({ ok: true, meal_id: meal.id, score, is_first_meal: isFirstMeal })
}
