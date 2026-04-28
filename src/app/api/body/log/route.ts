import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'

/**
 * Body composition log endpoint.
 * POST → insert a body_logs row. GET → return last 90 days for the caller.
 */

type BodyLogBody = {
  measured_at?: string
  weight_kg?: number
  body_fat_pct?: number
  muscle_mass_kg?: number
  water_pct?: number
  visceral_fat?: number
  bmr_kcal?: number
  source?: 'manual' | 'scale' | 'wearable' | 'import'
  source_device?: string
  notes?: string
}

const finiteNum = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export async function POST(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  let body: BodyLogBody
  try {
    body = (await request.json()) as BodyLogBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const row = {
    user_id: user.id,
    measured_at: body.measured_at || new Date().toISOString().slice(0, 10),
    weight_kg: finiteNum(body.weight_kg),
    body_fat_pct: finiteNum(body.body_fat_pct),
    muscle_mass_kg: finiteNum(body.muscle_mass_kg),
    water_pct: finiteNum(body.water_pct),
    visceral_fat: finiteNum(body.visceral_fat),
    bmr_kcal: finiteNum(body.bmr_kcal),
    source: ['manual', 'scale', 'wearable', 'import'].includes(body.source ?? '')
      ? body.source
      : 'manual',
    source_device: body.source_device?.slice(0, 50) ?? null,
    notes: body.notes?.slice(0, 1000) ?? null,
  }

  // At least one numeric field must be present
  const hasValue = [row.weight_kg, row.body_fat_pct, row.muscle_mass_kg, row.water_pct, row.visceral_fat, row.bmr_kcal].some(
    (v) => v != null,
  )
  if (!hasValue) {
    return NextResponse.json({ error: 'Provide at least one measurement' }, { status: 400 })
  }

  const { data, error } = await supabase.from('body_logs').insert(row).select().single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, log: data })
}

export async function GET(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const url = new URL(request.url)
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 90, 1), 365)
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('body_logs')
    .select('id,measured_at,weight_kg,body_fat_pct,muscle_mass_kg,water_pct,visceral_fat,source')
    .eq('user_id', user.id)
    .gte('measured_at', from)
    .order('measured_at', { ascending: true })
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ logs: data ?? [] })
}
