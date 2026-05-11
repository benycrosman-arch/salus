import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import type { SupabaseClient } from '@supabase/supabase-js'

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
    return NextResponse.json({ error: 'Apenas nutricionistas podem editar orientações.' }, { status: 403 })
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

export async function POST(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const body = (await request.json().catch(() => null)) as
    | { patientId?: string; body?: string }
    | null
  const patientId = String(body?.patientId ?? '').trim()
  const text = String(body?.body ?? '').trim().slice(0, 4000)

  if (!patientId) {
    return NextResponse.json({ error: 'patientId é obrigatório.' }, { status: 400 })
  }
  if (text.length < 20) {
    return NextResponse.json(
      { error: 'A orientação precisa ter pelo menos 20 caracteres.' },
      { status: 400 },
    )
  }

  const guardError = await ensureNutriAndLink(supabase, user.id, patientId)
  if (guardError) return guardError

  const { error: deactivateError } = await supabase
    .from('nutri_recommendations')
    .update({ is_active: false })
    .eq('patient_id', patientId)
    .eq('is_active', true)
  if (deactivateError) {
    return NextResponse.json({ error: deactivateError.message }, { status: 500 })
  }

  const { data: inserted, error: insertError } = await supabase
    .from('nutri_recommendations')
    .insert({
      nutri_id: user.id,
      patient_id: patientId,
      body: text,
      is_active: true,
    })
    .select('id, body, is_active, created_at')
    .single()
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, recommendation: inserted })
}

export async function GET(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { supabase } = guard

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patientId')?.trim()
  if (!patientId) {
    return NextResponse.json({ error: 'patientId é obrigatório.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('nutri_recommendations')
    .select('id, body, is_active, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, recommendations: data ?? [] })
}
