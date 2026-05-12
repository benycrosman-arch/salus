import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { guardRequest } from '@/lib/api-guard'

/**
 * Set / read macro targets for one of the nutri's linked patients.
 *
 * Writes are authorized at the DB layer: patient_goals RLS requires the
 * row's (nutri_id, patient_id) pair to have an active link in
 * nutri_patient_links. A nutri trying to set goals for someone they don't
 * have an active link with gets a transparent 403 from PostgREST.
 *
 * Idempotent: same (nutri_id, patient_id) overwrites — there's a unique
 * constraint on that pair, no goal history persisted.
 */

const PatchSchema = z.object({
  patient_id: z.string().uuid(),
  calories_target: z.number().int().positive().lt(20000).nullable().optional(),
  protein_g: z.number().int().nonnegative().lt(2000).nullable().optional(),
  carbs_g: z.number().int().nonnegative().lt(2000).nullable().optional(),
  fat_g: z.number().int().nonnegative().lt(2000).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
})

export async function POST(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.', issues: parsed.error.flatten() }, { status: 400 })
  }
  const input = parsed.data

  // Nutri-only — same gate as everywhere else.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'nutricionista') {
    return NextResponse.json({ error: 'Apenas nutricionistas podem definir metas.' }, { status: 403 })
  }

  // Upsert. The unique (nutri_id, patient_id) constraint makes this a
  // PATCH-by-pair. We only write columns the caller provided so partial
  // updates don't wipe other fields.
  const payload: Record<string, unknown> = {
    nutri_id: user.id,
    patient_id: input.patient_id,
  }
  if ('calories_target' in input) payload.calories_target = input.calories_target
  if ('protein_g' in input) payload.protein_g = input.protein_g
  if ('carbs_g' in input) payload.carbs_g = input.carbs_g
  if ('fat_g' in input) payload.fat_g = input.fat_g
  if ('notes' in input) payload.notes = input.notes

  const { data, error } = await supabase
    .from('patient_goals')
    .upsert(payload, { onConflict: 'nutri_id,patient_id' })
    .select('id, nutri_id, patient_id, calories_target, protein_g, carbs_g, fat_g, notes, updated_at')
    .single()

  if (error) {
    // 42501 = insufficient_privilege — most likely RLS denying because no
    // active link exists. Surface a friendly message instead of leaking
    // Postgres internals.
    if (error.code === '42501' || /row.level security/i.test(error.message)) {
      return NextResponse.json(
        { error: 'Você precisa de um vínculo ativo com este paciente para definir metas.' },
        { status: 403 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit log via the RPC from migration 030. Best-effort — don't fail
  // the request if the log write hiccups, but log a server warning so we
  // notice gaps in production.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const ua = request.headers.get('user-agent')?.slice(0, 500) ?? null
  const { error: auditErr } = await supabase.rpc('log_audit', {
    p_action: 'goals_updated',
    p_entity: 'patient_goals',
    p_entity_id: data.id,
    p_metadata: {
      patient_id: data.patient_id,
      calories_target: data.calories_target,
      protein_g: data.protein_g,
      carbs_g: data.carbs_g,
      fat_g: data.fat_g,
    },
    p_ip: ip,
    p_user_agent: ua,
  })
  if (auditErr) console.warn('log_audit goals_updated failed:', auditErr.message)

  return NextResponse.json({ ok: true, goals: data })
}

export async function GET(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const patientId = request.nextUrl.searchParams.get('patient_id')?.trim()
  if (!patientId || !/^[0-9a-f-]{36}$/i.test(patientId)) {
    return NextResponse.json({ error: 'patient_id obrigatório.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('patient_goals')
    .select('id, nutri_id, patient_id, calories_target, protein_g, carbs_g, fat_g, notes, updated_at')
    .eq('nutri_id', user.id)
    .eq('patient_id', patientId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goals: data ?? null })
}
