import type { SupabaseClient } from '@supabase/supabase-js'
import { getProStatus, type Tier } from './pro'

export type FeatureKey = 'meal_photo_analysis' | 'nutri_patient_added'

export type QuotaWindow = 'lifetime' | 'monthly'

interface TierQuota {
  limit: number      // -1 means unlimited
  window: QuotaWindow
}

/**
 * Per-feature, per-tier quotas. Free is the @itsdavixavier hard wall.
 * Essencial (R$29) gets generous monthly windows. Pro and Nutri are unlimited.
 */
export const FEATURE_QUOTAS: Record<FeatureKey, Record<Tier, TierQuota>> = {
  meal_photo_analysis: {
    free:      { limit: 3,  window: 'lifetime' },
    essencial: { limit: 30, window: 'monthly'  },
    pro:       { limit: -1, window: 'monthly'  },
    nutri:     { limit: -1, window: 'monthly'  },
  },
  nutri_patient_added: {
    free:      { limit: 0,  window: 'lifetime' },
    essencial: { limit: 0,  window: 'lifetime' },
    pro:       { limit: 0,  window: 'lifetime' },
    nutri:     { limit: -1, window: 'lifetime' },
  },
}

export interface QuotaResult {
  tier: Tier
  used: number
  limit: number       // -1 = unlimited
  remaining: number   // Infinity when unlimited
  blocked: boolean
  window: QuotaWindow
}

export async function getQuotaUsage(
  supabase: SupabaseClient,
  userId: string,
  key: FeatureKey,
): Promise<QuotaResult> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at, plan, subscription_status, subscription_product_id, subscription_expires_at, role')
    .eq('id', userId)
    .maybeSingle()

  const pro = getProStatus(profile)
  const tier = pro.tier
  const tierQuota = FEATURE_QUOTAS[key][tier]

  if (tierQuota.limit === -1) {
    return { tier, used: 0, limit: -1, remaining: Infinity, blocked: false, window: tierQuota.window }
  }

  const used = await countUsage(supabase, userId, key, tierQuota.window)
  const remaining = Math.max(0, tierQuota.limit - used)
  return {
    tier,
    used,
    limit: tierQuota.limit,
    remaining,
    blocked: used >= tierQuota.limit,
    window: tierQuota.window,
  }
}

function startOfMonthISO(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

async function countUsage(
  supabase: SupabaseClient,
  userId: string,
  key: FeatureKey,
  window: QuotaWindow,
): Promise<number> {
  switch (key) {
    case 'meal_photo_analysis': {
      let q = supabase
        .from('meals')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('photo_url', 'is', null)
      if (window === 'monthly') q = q.gte('created_at', startOfMonthISO())
      const { count } = await q
      return count ?? 0
    }
    case 'nutri_patient_added': {
      const { count } = await supabase
        .from('nutri_patient_links')
        .select('id', { count: 'exact', head: true })
        .eq('nutri_id', userId)
        .eq('status', 'active')
      return count ?? 0
    }
  }
}
