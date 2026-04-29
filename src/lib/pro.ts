/**
 * Plan tiering and trial gating.
 *
 * Tiers:
 *   - free       → 3 lifetime photo analyses then hard-blocked (the @itsdavixavier wall)
 *   - essencial  → R$29/mo, all features with monthly windowed limits
 *   - pro        → R$59/mo, unlimited
 *   - nutri      → R$249/mo for licensed nutricionistas, unlimited + dashboard
 *
 * Trial: every account gets 7 days of full Pro access starting from
 * `profiles.created_at`. After that, only an active subscription keeps Pro on.
 * The trial is implicit — no DB column needed; we derive it from created_at.
 */

export const TRIAL_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

export type ProSource = 'subscription' | 'trial' | 'nutri' | 'none'
export type Tier = 'free' | 'essencial' | 'pro' | 'nutri'

export interface ProStatus {
  isPro: boolean              // user has access to any paid feature right now (essencial, pro, or nutri)
  tier: Tier
  source: ProSource
  trialActive: boolean
  trialEndsAt: Date | null
  trialDaysLeft: number
}

interface ProInputs {
  created_at?: string | null
  plan?: string | null
  subscription_status?: string | null
  subscription_product_id?: string | null
  subscription_expires_at?: string | null
  role?: string | null
}

const SUB_ACTIVE = new Set(['active', 'trialing', 'in_grace_period'])

function tierFromProductId(productId: string | null | undefined): Tier {
  if (!productId) return 'pro'
  const id = productId.toLowerCase()
  if (id.includes('essencial') || id.includes('essential') || id.includes('mid')) return 'essencial'
  if (id.includes('nutri')) return 'nutri'
  return 'pro'
}

export function getProStatus(profile: ProInputs | null | undefined, now: Date = new Date()): ProStatus {
  if (!profile) {
    return { isPro: false, tier: 'free', source: 'none', trialActive: false, trialEndsAt: null, trialDaysLeft: 0 }
  }

  // Nutricionistas: top-tier always.
  if (profile.role === 'nutricionista' || profile.plan === 'nutri_pro') {
    return { isPro: true, tier: 'nutri', source: 'nutri', trialActive: false, trialEndsAt: null, trialDaysLeft: 0 }
  }

  // Active paid subscription wins regardless of trial state.
  const subActive = profile.subscription_status && SUB_ACTIVE.has(profile.subscription_status)
  const subNotExpired =
    !profile.subscription_expires_at ||
    new Date(profile.subscription_expires_at).getTime() > now.getTime()
  if (subActive && subNotExpired) {
    const tier = (profile.plan === 'essencial' ? 'essencial' : tierFromProductId(profile.subscription_product_id))
    return { isPro: true, tier, source: 'subscription', trialActive: false, trialEndsAt: null, trialDaysLeft: 0 }
  }

  // Implicit 7-day trial from account creation grants full Pro.
  if (profile.created_at) {
    const createdMs = new Date(profile.created_at).getTime()
    const trialEndsAt = new Date(createdMs + TRIAL_DAYS * DAY_MS)
    const msLeft = trialEndsAt.getTime() - now.getTime()
    const trialActive = msLeft > 0
    const trialDaysLeft = trialActive ? Math.ceil(msLeft / DAY_MS) : 0
    if (trialActive) {
      return { isPro: true, tier: 'pro', source: 'trial', trialActive: true, trialEndsAt, trialDaysLeft }
    }
    return { isPro: false, tier: 'free', source: 'none', trialActive: false, trialEndsAt, trialDaysLeft: 0 }
  }

  return { isPro: false, tier: 'free', source: 'none', trialActive: false, trialEndsAt: null, trialDaysLeft: 0 }
}
