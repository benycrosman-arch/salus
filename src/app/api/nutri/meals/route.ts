import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MEAL_TYPES, type MealType } from '@/lib/nutri/generate-meals'

async function ensureNutriAndLink(
  supabase: SupabaseClient,
  nutriId: string,
  patientId: string,
): Promise<NextResponse | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', nutriId)
    .maybeSingle()
  if (profile?.role !== 'nutricionista') {
    return NextResponse.json({ error: 'Apenas nutricionistas podem editar refeições.' }, { status: 403 })
  }
  const { data: link } = await supabase
    .from('nutri_patient_links')
    .select('status')
    .eq('nutri_id', nutriId)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .maybeSingle()
  if (!link) {
    return NextResponse.json({ error: 'Paciente não vinculado a você.' }, { status: 403 })
  }
  return null
}

interface IncomingOption {
  meal_type?: string
  title?: string
  description?: string
  macros?: { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number; fiber_g?: number }
  source?: string
}

function n(v: unknown): number {
  const x = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(x) ? Math.max(0, Math.round(x)) : 0
}

function sanitizeOption(raw: IncomingOption) {
  const meal_type = String(raw.meal_type ?? '')
  if (!MEAL_TYPES.includes(meal_type as MealType)) return null
  const title = String(raw.title ?? '').trim().slice(0, 200)
  if (title.length < 2) return null
  const m = raw.macros ?? {}
  return {
    meal_type,
    title,
    description: String(raw.description ?? '').trim().slice(0, 2000) || null,
    macros: {
      calories: n(m.calories),
      protein_g: n(m.protein_g),
      carbs_g: n(m.carbs_g),
      fat_g: n(m.fat_g),
      fiber_g: n(m.fiber_g),
    },
    source: raw.source === 'ai' ? 'ai' : 'manual',
  }
}

export async function GET(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { supabase } = guard

  const patientId = new URL(request.url).searchParams.get('patientId')?.trim()
  if (!patientId) {
    return NextResponse.json({ error: 'patientId é obrigatório.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('nutri_meal_options')
    .select('id, meal_type, title, description, macros, source, parent_option_id, is_active, position, created_at')
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .order('meal_type', { ascending: true })
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, options: data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const body = (await request.json().catch(() => null)) as
    | { patientId?: string; options?: IncomingOption[]; option?: IncomingOption }
    | null
  const patientId = String(body?.patientId ?? '').trim()
  if (!patientId) {
    return NextResponse.json({ error: 'patientId é obrigatório.' }, { status: 400 })
  }

  const rawList = body?.options ?? (body?.option ? [body.option] : [])
  if (rawList.length === 0) {
    return NextResponse.json({ error: 'Nenhuma refeição enviada.' }, { status: 400 })
  }
  if (rawList.length > 30) {
    return NextResponse.json({ error: 'Máximo de 30 refeições por vez.' }, { status: 400 })
  }

  const sanitized = rawList.map(sanitizeOption).filter((o): o is NonNullable<typeof o> => o !== null)
  if (sanitized.length === 0) {
    return NextResponse.json({ error: 'Refeições inválidas (tipo ou título ausente).' }, { status: 400 })
  }

  const guardError = await ensureNutriAndLink(supabase, user.id, patientId)
  if (guardError) return guardError

  const rows = sanitized.map((o, i) => ({
    nutri_id: user.id,
    patient_id: patientId,
    created_by: user.id,
    meal_type: o.meal_type,
    title: o.title,
    description: o.description,
    macros: o.macros,
    source: o.source,
    position: i,
  }))

  const { data, error } = await supabase
    .from('nutri_meal_options')
    .insert(rows)
    .select('id, meal_type, title, description, macros, source, parent_option_id, is_active, position, created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, options: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const body = (await request.json().catch(() => null)) as
    | { id?: string; patientId?: string; title?: string; description?: string; macros?: IncomingOption['macros'] }
    | null
  const id = String(body?.id ?? '').trim()
  const patientId = String(body?.patientId ?? '').trim()
  if (!id || !patientId) {
    return NextResponse.json({ error: 'id e patientId são obrigatórios.' }, { status: 400 })
  }

  const guardError = await ensureNutriAndLink(supabase, user.id, patientId)
  if (guardError) return guardError

  const update: Record<string, unknown> = {}
  if (typeof body?.title === 'string') {
    const t = body.title.trim().slice(0, 200)
    if (t.length < 2) return NextResponse.json({ error: 'Título muito curto.' }, { status: 400 })
    update.title = t
  }
  if (typeof body?.description === 'string') {
    update.description = body.description.trim().slice(0, 2000) || null
  }
  if (body?.macros) {
    const m = body.macros
    update.macros = {
      calories: n(m.calories),
      protein_g: n(m.protein_g),
      carbs_g: n(m.carbs_g),
      fat_g: n(m.fat_g),
      fiber_g: n(m.fiber_g),
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('nutri_meal_options')
    .update(update)
    .eq('id', id)
    .eq('nutri_id', user.id)
    .select('id, meal_type, title, description, macros, source, parent_option_id, is_active, position, created_at')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Refeição não encontrada.' }, { status: 404 })

  return NextResponse.json({ ok: true, option: data })
}

export async function DELETE(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const id = new URL(request.url).searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 })

  const { error } = await supabase
    .from('nutri_meal_options')
    .delete()
    .eq('id', id)
    .eq('nutri_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
