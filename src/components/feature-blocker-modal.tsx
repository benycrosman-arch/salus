'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Lock, Apple, Smartphone } from 'lucide-react'
import { track } from '@/lib/posthog'
import type { FeatureKey } from '@/lib/feature-quota'
import type { Tier } from '@/lib/pro'

interface FeatureBlockerModalProps {
  isOpen: boolean
  featureKey: FeatureKey
  tier: Tier
  used: number
  limit: number
}

export function FeatureBlockerModal({ isOpen, featureKey, tier, used, limit }: FeatureBlockerModalProps) {
  const t = useTranslations('featureBlocker')
  const tp = useTranslations('pricing')

  useEffect(() => {
    if (isOpen) track('feature_blocker_shown', { feature: featureKey, tier, used, limit })
  }, [isOpen, featureKey, tier, used, limit])

  // Decide which body copy + which target plan to upsell.
  let title = ''
  let body = ''
  let upsellPlanKey: 'essencial' | 'pro' | 'nutri' = 'essencial'

  if (featureKey === 'meal_photo_analysis') {
    title = t('mealPhotoAnalysis.title')
    if (tier === 'essencial') {
      body = t('mealPhotoAnalysis.bodyEssencial', { limit })
      upsellPlanKey = 'pro'
    } else {
      body = t('mealPhotoAnalysis.bodyFree', { limit })
      upsellPlanKey = 'essencial'
    }
  } else {
    title = t('nutriPatientAdded.title')
    body = t('nutriPatientAdded.body')
    upsellPlanKey = 'nutri'
  }

  const planName = tp(`${upsellPlanKey}.name`)
  const planPrice = tp(`${upsellPlanKey}.price`)
  const planPeriod = tp(`${upsellPlanKey}.period`)
  const planNote = tp(`${upsellPlanKey}.note`)

  return (
    <Dialog open={isOpen} onOpenChange={() => { /* non-dismissable */ }}>
      <DialogContent
        className="sm:max-w-md rounded-3xl border-[#e4ddd4] bg-white p-0 overflow-hidden [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        <div className="bg-[#1a3a2a] px-8 pt-10 pb-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-[#c4614a]/20 flex items-center justify-center mb-5">
            <Lock className="h-6 w-6 text-[#c4614a]" />
          </div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="mt-3 text-sm text-white/70 leading-relaxed">{body}</p>
        </div>

        <div className="px-6 py-6 space-y-3 bg-white">
          <div className="rounded-2xl border-2 border-[#4a7c4a] bg-[#4a7c4a]/5 px-5 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#4a7c4a]">{planName}</p>
                <p className="text-xs text-[#1a3a2a]/60 mt-1 truncate">{planNote}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-serif text-2xl italic text-[#1a3a2a]">{planPrice}</p>
                <p className="text-[10px] text-[#1a3a2a]/50">{planPeriod}</p>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-[#1a3a2a]/50">{t('appNote')}</p>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <Button
              asChild
              className="h-12 rounded-2xl bg-[#1a3a2a] font-semibold text-white hover:bg-[#1a3a2a]/90"
            >
              <a
                href="/#download"
                onClick={() => track('feature_blocker_cta_clicked', { feature: featureKey, tier, plan: upsellPlanKey, platform: 'ios' })}
              >
                <Apple className="w-4 h-4 mr-2" />
                {t('ios')}
              </a>
            </Button>
            <Button
              asChild
              className="h-12 rounded-2xl bg-[#1a3a2a] font-semibold text-white hover:bg-[#1a3a2a]/90"
            >
              <a
                href="/#download"
                onClick={() => track('feature_blocker_cta_clicked', { feature: featureKey, tier, plan: upsellPlanKey, platform: 'android' })}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                {t('android')}
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
