'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ProSource, Tier } from './pro'

export interface ProStatusClient {
  isPro: boolean
  tier: Tier
  source: ProSource
  trialActive: boolean
  trialEndsAt: string | null
  trialDaysLeft: number
}

const INITIAL: ProStatusClient = {
  isPro: false,
  tier: 'free',
  source: 'none',
  trialActive: false,
  trialEndsAt: null,
  trialDaysLeft: 0,
}

export function useProStatus() {
  const [status, setStatus] = useState<ProStatusClient>(INITIAL)
  const [loaded, setLoaded] = useState(false)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/me/pro-status', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setStatus({
        isPro: !!data.isPro,
        tier: (data.tier as Tier) ?? 'free',
        source: (data.source as ProSource) ?? 'none',
        trialActive: !!data.trialActive,
        trialEndsAt: data.trialEndsAt ?? null,
        trialDaysLeft: typeof data.trialDaysLeft === 'number' ? data.trialDaysLeft : 0,
      })
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    void refetch()
    const onFocus = () => { void refetch() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refetch])

  return { ...status, loaded, refetch }
}
