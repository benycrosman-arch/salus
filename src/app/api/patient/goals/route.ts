import { NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'

/**
 * Patient reads their own nutri-set macro targets. RLS already restricts
 * patient_goals to rows where patient_id = auth.uid(), so the filter here
 * is belt-and-suspenders.
 *
 * Returns at most one row (unique on nutri_id+patient_id; if a patient is
 * somehow linked to two nutris and both set goals, we surface the most
 * recently updated set — but the kanban/UI only allows one active
 * nutri-patient link at a time today).
 */
export async function GET() {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const { data, error } = await supabase
    .from('patient_goals')
    .select('id, nutri_id, patient_id, calories_target, protein_g, carbs_g, fat_g, notes, updated_at')
    .eq('patient_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goals: data ?? null })
}
