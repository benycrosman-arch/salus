'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FeatureKey, QuotaWindow } from './feature-quota'
import type { Tier } from './pro'

interface QuotaState {
  tier: Tier
  used: number
  limit: number       // -1 = unlimited
  remaining: number   // Infinity when unlimited (sent as -1 over JSON)
  blocked: boolean
  window: QuotaWindow
  loaded: boolean
}

const INITIAL: QuotaState = {
  tier: 'free',
  used: 0,
  limit: 0,
  remaining: 0,
  blocked: false,
  window: 'lifetime',
  loaded: false,
}

export function useFeatureQuota(key: FeatureKey) {
  const [state, setState] = useState<QuotaState>(INITIAL)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/me/quota?key=${key}`, { cache: 'no-store' })
      if (!res.ok) {
        setState((s) => ({ ...s, loaded: true }))
        return
      }
      const data = await res.json()
      const remaining = data.remaining === null || !Number.isFinite(data.remaining) ? Infinity : data.remaining
      setState({
        tier: (data.tier as Tier) ?? 'free',
        used: typeof data.used === 'number' ? data.used : 0,
        limit: typeof data.limit === 'number' ? data.limit : 0,
        remaining,
        blocked: !!data.blocked,
        window: (data.window as QuotaWindow) ?? 'lifetime',
        loaded: true,
      })
    } catch {
      setState((s) => ({ ...s, loaded: true }))
    }
  }, [key])

  useEffect(() => { void refetch() }, [refetch])

  const isUnlimited = state.limit === -1
  return { ...state, isUnlimited, refetch }
}
