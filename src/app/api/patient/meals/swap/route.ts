import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import {
  generateMealSwap,
  loadPatientContext,
  MEAL_TYPES,
  type MealType,
} from '@/lib/nutri/generate-meals'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const body = (await request.json().catch(() => null)) as
    | { optionId?: string; note?: string }
    | null
  const optionId = String(body?.optionId ?? '').trim()
  if (!optionId) {
    return NextResponse.json({ error: 'optionId é obrigatório.' }, { status: 400 })
  }

  // RLS lets the paciente read only their own options; this both fetches the
  // original and confirms ownership in one query.
  const { data: original } = await supabase
    .from('nutri_meal_options')
    .select('id, nutri_id, patient_id, meal_type, title, description, macros, source')
    .eq('id', optionId)
    .maybeSingle()

  if (!original || original.patient_id !== user.id) {
    return NextResponse.json({ error: 'Refeição não encontrada.' }, { status: 404 })
  }
  if (original.source === 'patient_swap') {
    return NextResponse.json(
      { error: 'Troque a partir da refeição original definida pela sua nutri.' },
      { status: 400 },
    )
  }
  if (!MEAL_TYPES.includes(original.meal_type as MealType)) {
    return NextResponse.json({ error: 'Tipo de refeição inválido.' }, { status: 400 })
  }

  const m = (original.macros ?? {}) as Record<string, number>
  let swap
  try {
    const ctx = await loadPatientContext(supabase, user.id)
    swap = await generateMealSwap(
      ctx,
      {
        meal_type: original.meal_type as MealType,
        title: original.title,
        description: original.description ?? '',
        macros: {
          calories: m.calories ?? 0,
          protein_g: m.protein_g ?? 0,
          carbs_g: m.carbs_g ?? 0,
          fat_g: m.fat_g ?? 0,
          fiber_g: m.fiber_g ?? 0,
        },
      },
      body?.note,
    )
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes('ANTHROPIC_API_KEY')
        ? 'IA não configurada no servidor. Avise o suporte.'
        : 'Não consegui gerar uma alternativa agora. Tente de novo em instantes.'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // One variation per original option — drop any previous swap of this option.
  await supabase
    .from('nutri_meal_options')
    .delete()
    .eq('parent_option_id', optionId)
    .eq('created_by', user.id)
    .eq('source', 'patient_swap')

  const { data: inserted, error } = await supabase
    .from('nutri_meal_options')
    .insert({
      nutri_id: original.nutri_id,
      patient_id: user.id,
      created_by: user.id,
      meal_type: original.meal_type,
      title: swap.title,
      description: swap.description,
      macros: swap.macros,
      source: 'patient_swap',
      parent_option_id: optionId,
    })
    .select('id, meal_type, title, description, macros, source, parent_option_id, is_active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, option: inserted })
}

export async function DELETE(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const id = new URL(request.url).searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 })

  // RLS restricts this to the paciente's own swap rows.
  const { error } = await supabase
    .from('nutri_meal_options')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id)
    .eq('source', 'patient_swap')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
