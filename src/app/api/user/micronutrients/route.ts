import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'

/**
 * Sums today's micronutrients across the caller's logged meals.
 * Reads from `meals.foods_detected` (legacy) and `meals.food_refs` (new RAG path).
 *
 * Strategy:
 *   1. Pull today's meals
 *   2. For each food_ref, look up canonical food's micronutrients × grams
 *   3. For each foods_detected entry without a food_ref, sum any inline `micronutrients` field
 *   4. Return aggregated map { vit_c_mg: 45.2, iron_mg: 8.1, ... }
 */

type MicroMap = Record<string, number>

export async function GET(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const url = new URL(request.url)
  const dateParam = url.searchParams.get('date') || new Date().toISOString().slice(0, 10)

  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, food_refs, foods_detected, macros')
    .eq('user_id', user.id)
    .gte('logged_at', `${dateParam}T00:00:00`)
    .lt('logged_at', `${dateParam}T23:59:59`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const totals: MicroMap = {}

  // Collect all food_ids referenced by today's meals
  const refs: Array<{ food_id: string; grams: number }> = []
  for (const m of meals ?? []) {
    if (Array.isArray(m.food_refs)) {
      for (const r of m.food_refs as Array<{ food_id?: string; grams?: number }>) {
        if (r?.food_id && typeof r.grams === 'number') {
          refs.push({ food_id: r.food_id, grams: r.grams })
        }
      }
    }
    // Legacy path: foods_detected may have inline micronutrients
    if (Array.isArray(m.foods_detected)) {
      for (const f of m.foods_detected as Array<{ micronutrients?: Record<string, number> }>) {
        if (f.micronutrients && typeof f.micronutrients === 'object') {
          for (const [k, v] of Object.entries(f.micronutrients)) {
            if (typeof v === 'number') totals[k] = (totals[k] ?? 0) + v
          }
        }
      }
    }
  }

  // Batch fetch canonical foods micronutrients
  if (refs.length > 0) {
    const ids = Array.from(new Set(refs.map((r) => r.food_id)))
    const { data: foods } = await supabase
      .from('foods')
      .select('id, micronutrients')
      .in('id', ids)
    const microsById = new Map<string, Record<string, number>>(
      (foods ?? []).map((f) => [
        f.id as string,
        (f.micronutrients ?? {}) as Record<string, number>,
      ]),
    )
    for (const ref of refs) {
      const micros = microsById.get(ref.food_id)
      if (!micros) continue
      const ratio = ref.grams / 100
      for (const [k, v] of Object.entries(micros)) {
        if (typeof v === 'number') totals[k] = (totals[k] ?? 0) + v * ratio
      }
    }
  }

  // Round all values for clean UI
  for (const k of Object.keys(totals)) {
    totals[k] = Math.round(totals[k] * 100) / 100
  }

  return NextResponse.json({ date: dateParam, totals })
}
