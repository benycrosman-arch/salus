'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Sparkles, Lock } from 'lucide-react'
import { useProStatus } from '@/lib/use-pro-status'
import { PaywallModal } from '@/components/paywall-modal'

export function TrialBanner() {
  const pro = useProStatus()
  const t = useTranslations('trial')
  const [open, setOpen] = useState(false)

  // Don't render until we know the status, and skip when Pro is via subscription
  // or nutri (no trial concept) or trial is fresh enough that the message is noise.
  if (!pro.loaded) return null
  if (pro.source === 'subscription' || pro.source === 'nutri') return null

  // Show: trial expired, OR trial active with <= 3 days left.
  const showExpired = !pro.isPro
  const showCountdown = pro.trialActive && pro.trialDaysLeft <= 3

  if (!showExpired && !showCountdown) return null

  const isUrgent = showExpired
  const message = showExpired
    ? t('expired')
    : pro.trialDaysLeft <= 1
      ? t('lastDay')
      : t('daysLeft', { days: pro.trialDaysLeft })

  return (
    <>
      <div
        className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium ${
          isUrgent
            ? 'bg-[#c4614a] text-white'
            : 'bg-[#1a3a2a]/[0.06] text-[#1a3a2a] ring-1 ring-[#1a3a2a]/10'
        }`}
      >
        <div className="flex items-center gap-2">
          {isUrgent ? <Lock className="h-4 w-4 shrink-0" /> : <Sparkles className="h-4 w-4 shrink-0 text-[#c4614a]" />}
          <span>{message}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            isUrgent
              ? 'bg-white text-[#c4614a]'
              : 'bg-[#1a3a2a] text-white hover:bg-[#1a3a2a]/90'
          } transition-colors`}
        >
          {t('upgradeCta')}
        </button>
      </div>
      <PaywallModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
