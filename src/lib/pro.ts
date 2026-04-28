/**
 * Pro / trial gating.
 *
 * Trial: every account gets 7 days of full Pro access starting from
 * `profiles.created_at`. After that, only an active subscription keeps Pro on.
 * The trial is implicit — no DB column needed; we derive it from created_at.
 */

export const TRIAL_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

export type ProSource = 'subscription' | 'trial' | 'nutri' | 'none'

export interface ProStatus {
  isPro: boolean              // user has access to Pro features right now
  source: ProSource
  trialActive: boolean
  trialEndsAt: Date | null    // null if subscribed (trial irrelevant) or no created_at
  trialDaysLeft: number       // 0 once expired
}

interface ProInputs {
  created_at?: string | null
  plan?: string | null
  subscription_status?: string | null
  subscription_expires_at?: string | null
  role?: string | null
}

const SUB_ACTIVE = new Set(['active', 'trialing', 'in_grace_period'])

export function getProStatus(profile: ProInputs | null | undefined, now: Date = new Date()): ProStatus {
  if (!profile) {
    return { isPro: false, source: 'none', trialActive: false, trialEndsAt: null, trialDaysLeft: 0 }
  }

  // Nutricionistas always get Pro features; their plan is the nutri panel itself.
  if (profile.role === 'nutricionista' || profile.plan === 'nutri_pro') {
    return { isPro: true, source: 'nutri', trialActive: false, trialEndsAt: null, trialDaysLeft: 0 }
  }

  // Active paid subscription wins regardless of trial state.
  const subActive = profile.subscription_status && SUB_ACTIVE.has(profile.subscription_status)
  const subNotExpired =
    !profile.subscription_expires_at ||
    new Date(profile.subscription_expires_at).getTime() > now.getTime()
  if (subActive && subNotExpired) {
    return { isPro: true, source: 'subscription', trialActive: false, trialEndsAt: null, trialDaysLeft: 0 }
  }

  // Implicit 7-day trial from account creation.
  if (profile.created_at) {
    const createdMs = new Date(profile.created_at).getTime()
    const trialEndsAt = new Date(createdMs + TRIAL_DAYS * DAY_MS)
    const msLeft = trialEndsAt.getTime() - now.getTime()
    const trialActive = msLeft > 0
    const trialDaysLeft = trialActive ? Math.ceil(msLeft / DAY_MS) : 0
    if (trialActive) {
      return { isPro: true, source: 'trial', trialActive: true, trialEndsAt, trialDaysLeft }
    }
    return { isPro: false, source: 'none', trialActive: false, trialEndsAt, trialDaysLeft: 0 }
  }

  return { isPro: false, source: 'none', trialActive: false, trialEndsAt: null, trialDaysLeft: 0 }
}
