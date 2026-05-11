import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'

/**
 * Manual hydration logging — writes into wearable_data so the dashboard's
 * existing hydration-sum query picks it up alongside Apple Health / Fitbit
 * imports. Single ml integer per call; clamped to a sane single-pour range.
 */

const MIN_ML = 50
const MAX_ML = 2000

export async function POST(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  let body: { ml?: unknown }
  try {
    body = (await request.json()) as { ml?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const ml = typeof body.ml === 'number' ? body.ml : Number(body.ml)
  if (!Number.isFinite(ml) || ml < MIN_ML || ml > MAX_ML) {
    return NextResponse.json(
      { error: `ml must be a number between ${MIN_ML} and ${MAX_ML}` },
      { status: 400 },
    )
  }

  const { error } = await supabase.from('wearable_data').insert({
    user_id: user.id,
    provider: 'manual',
    metric: 'water_ml',
    value: Math.round(ml),
    unit: 'ml',
    recorded_at: new Date().toISOString(),
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
