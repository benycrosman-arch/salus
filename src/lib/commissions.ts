import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side commission ledger writes. Only the RevenueCat webhook should call this
 * (uses the service-role client). Patients/nutris read via RLS.
 *
 * Pricing → monthly BRL is held here so a single source of truth survives.
 * If marketing changes prices, update once.
 */

export type PatientPlan = 'essencial' | 'pro'

export const PLAN_MONTHLY_BRL: Record<PatientPlan, number> = {
  essencial: 29,
  pro: 59,
}

/**
 * Best-effort plan resolution from a RevenueCat product id. Falls back to 'pro'
 * for unrecognised products since unlimited is the safe assumption for a paying user.
 */
export function planFromProductId(productId: string | null | undefined): PatientPlan {
  if (!productId) return 'pro'
  const id = productId.toLowerCase()
  if (id.includes('essencial') || id.includes('essential') || id.includes('mid') || id.includes('29')) {
    return 'essencial'
  }
  return 'pro'
}

/**
 * Resolve the active inviting nutri for a patient (if any). Returns null when
 * the patient self-signed up.
 */
async function findActiveNutriLink(
  supabase: SupabaseClient,
  patientId: string,
): Promise<{ nutri_id: string; commission_rate: number } | null> {
  const { data } = await supabase
    .from('nutri_patient_links')
    .select('nutri_id, commission_rate')
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return {
    nutri_id: data.nutri_id,
    commission_rate: typeof data.commission_rate === 'number' ? data.commission_rate : 0.30,
  }
}

/**
 * Open a commission row for an active subscription. Idempotent for the same
 * (nutri, patient, plan) tuple — closes any older active row first if the plan changed.
 */
export async function openCommission(params: {
  supabase: SupabaseClient
  patientId: string
  productId: string | null | undefined
  sourceEvent: string
}): Promise<{ ok: boolean; reason?: string; commissionId?: string }> {
  const { supabase, patientId, productId, sourceEvent } = params

  const link = await findActiveNutriLink(supabase, patientId)
  if (!link) return { ok: false, reason: 'no_active_nutri_link' }

  const plan = planFromProductId(productId)
  const monthlyBrl = PLAN_MONTHLY_BRL[plan]

  // Close any active row for this patient first (plan change / reattribution).
  await supabase
    .from('nutri_commissions')
    .update({ ended_at: new Date().toISOString() })
    .eq('patient_id', patientId)
    .is('ended_at', null)

  const { data, error } = await supabase
    .from('nutri_commissions')
    .insert({
      nutri_id: link.nutri_id,
      patient_id: patientId,
      patient_plan: plan,
      patient_monthly_brl: monthlyBrl,
      commission_rate: link.commission_rate,
      source_event: sourceEvent,
      rc_product_id: productId ?? null,
    })
    .select('id')
    .single()

  if (error) return { ok: false, reason: `insert_failed:${error.message}` }
  return { ok: true, commissionId: data?.id }
}

/**
 * Close active commission rows for a patient (cancellation / expiration).
 */
export async function closeCommission(params: {
  supabase: SupabaseClient
  patientId: string
}): Promise<{ ok: boolean; closed: number }> {
  const { supabase, patientId } = params
  const { error, count } = await supabase
    .from('nutri_commissions')
    .update({ ended_at: new Date().toISOString() }, { count: 'exact' })
    .eq('patient_id', patientId)
    .is('ended_at', null)
  if (error) return { ok: false, closed: 0 }
  return { ok: true, closed: count ?? 0 }
}
