import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import {
  generateMealOptions,
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
    | { patientId?: string; mealTypes?: string[] }
    | null
  const patientId = String(body?.patientId ?? '').trim()
  if (!patientId) {
    return NextResponse.json({ error: 'patientId é obrigatório.' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'nutricionista') {
    return NextResponse.json({ error: 'Apenas nutricionistas podem gerar refeições.' }, { status: 403 })
  }

  const { data: link } = await supabase
    .from('nutri_patient_links')
    .select('status')
    .eq('nutri_id', user.id)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .maybeSingle()
  if (!link) {
    return NextResponse.json({ error: 'Paciente não vinculado a você.' }, { status: 403 })
  }

  const requested = Array.isArray(body?.mealTypes) ? body!.mealTypes! : []
  const mealTypes = requested.filter((t): t is MealType =>
    MEAL_TYPES.includes(t as MealType),
  )

  try {
    const ctx = await loadPatientContext(supabase, patientId)
    const options = await generateMealOptions(ctx, mealTypes)
    if (options.length === 0) {
      return NextResponse.json(
        { error: 'A IA não conseguiu gerar opções. Tente novamente.' },
        { status: 502 },
      )
    }
    return NextResponse.json({ ok: true, options })
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes('ANTHROPIC_API_KEY')
        ? 'IA não configurada no servidor. Avise o suporte.'
        : 'Não consegui gerar as refeições agora. Tente de novo em instantes.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
