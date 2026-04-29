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
 * Commission tier ladder — must mirror the SQL function `nutri_commission_rate`
 * defined in migration 017. Kept here so server code can stamp the rate at
 * write time without an extra round-trip.
 */
export function nutriCommissionRate(activeCount: number): number {
  if (activeCount <= 0) return 0
  if (activeCount === 1) return 0.05
  if (activeCount === 2) return 0.06
  if (activeCount === 3) return 0.07
  if (activeCount === 4) return 0.08
  if (activeCount === 5) return 0.09
  if (activeCount <= 10) return 0.10
  return 0.12
}

export const COMMISSION_TIERS: Array<{ patients: string; rate: number }> = [
  { patients: '1',    rate: 0.05 },
  { patients: '2',    rate: 0.06 },
  { patients: '3',    rate: 0.07 },
  { patients: '4',    rate: 0.08 },
  { patients: '5',    rate: 0.09 },
  { patients: '6–10', rate: 0.10 },
  { patients: '11+',  rate: 0.12 },
]

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
): Promise<{ nutri_id: string } | null> {
  const { data } = await supabase
    .from('nutri_patient_links')
    .select('nutri_id')
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return { nutri_id: data.nutri_id }
}

/**
 * Count the nutri's currently-active referrals (rows still accruing).
 * Used to look up which tier this commission writes against.
 */
async function countActiveReferrals(supabase: SupabaseClient, nutriId: string): Promise<number> {
  const { count } = await supabase
    .from('nutri_commissions')
    .select('id', { count: 'exact', head: true })
    .eq('nutri_id', nutriId)
    .is('ended_at', null)
  return count ?? 0
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

  // Snapshot the bracket rate at write time. Effective payouts read from
  // `nutri_monthly_earnings`, which recomputes against the live active count.
  const activeAfter = (await countActiveReferrals(supabase, link.nutri_id)) + 1
  const rate = nutriCommissionRate(activeAfter)

  const { data, error } = await supabase
    .from('nutri_commissions')
    .insert({
      nutri_id: link.nutri_id,
      patient_id: patientId,
      patient_plan: plan,
      patient_monthly_brl: monthlyBrl,
      commission_rate: rate,
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
