'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Apple, Smartphone, Check } from 'lucide-react'
import { track } from '@/lib/posthog'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
}

type ConsumerPlan = 'essencial' | 'pro'

export function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const t = useTranslations('paywall')
  const tp = useTranslations('pricing')
  const [selected, setSelected] = useState<ConsumerPlan>('pro')

  useEffect(() => {
    if (isOpen) track('paywall_viewed')
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl border-[#e4ddd4] bg-white p-0 overflow-hidden">
        <DialogTitle className="sr-only">{t('srTitle')}</DialogTitle>

        {/* Header */}
        <div className="bg-gradient-to-b from-[#faf8f4] to-white px-8 pt-8 pb-6 text-center">
          <p className="font-serif text-lg italic text-[#1a3a2a] mb-3">{t('brand')}</p>
          <h2 className="text-2xl font-bold text-[#1a3a2a]">{t('headline')}</h2>
          <p className="mt-2 text-sm text-[#1a3a2a]/60">{t('subline')}</p>
        </div>

        {/* Plans (read-only — conversão real acontece no app via IAP) */}
        <div className="px-6 pb-4 space-y-2.5">
          {(['essencial', 'pro'] as const).map((plan) => {
            const isSelected = selected === plan
            const isPro = plan === 'pro'
            return (
              <button
                key={plan}
                type="button"
                onClick={() => setSelected(plan)}
                className={`relative w-full text-left rounded-2xl border-2 px-5 py-4 transition-colors ${
                  isSelected
                    ? 'border-[#4a7c4a] bg-[#4a7c4a]/5'
                    : 'border-[#e4ddd4] bg-white hover:border-[#1a3a2a]/20'
                }`}
              >
                {isPro && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-[#4a7c4a] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                    {tp('badges.mostPopular')}
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-[#4a7c4a]' : 'border-2 border-[#e4ddd4]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-[#1a3a2a]">{tp(`${plan}.name`)}</p>
                      <p className="text-xs text-[#1a3a2a]/60 mt-0.5 truncate">{tp(`${plan}.note`)}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-[#1a3a2a]">{tp(`${plan}.price`)}</p>
                      <p className="text-[10px] text-[#1a3a2a]/50">{tp(`${plan}.period`)}</p>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* CTAs: baixar app */}
        <div className="px-6 pb-3 space-y-2.5">
          <p className="text-center text-xs text-[#1a3a2a]/60 mb-1">{t('appNote')}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              asChild
              className="h-12 rounded-2xl bg-[#1a3a2a] font-semibold text-white hover:bg-[#1a3a2a]/90 transition-all"
            >
              <a href="#download" onClick={() => { track('paywall_cta_clicked', { platform: 'ios', plan: selected }); onClose() }}>
                <Apple className="w-4 h-4 mr-2" />
                {t('ios')}
              </a>
            </Button>
            <Button
              asChild
              className="h-12 rounded-2xl bg-[#1a3a2a] font-semibold text-white hover:bg-[#1a3a2a]/90 transition-all"
            >
              <a href="#download" onClick={() => { track('paywall_cta_clicked', { platform: 'android', plan: selected }); onClose() }}>
                <Smartphone className="w-4 h-4 mr-2" />
                {t('android')}
              </a>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-center gap-6 text-xs text-[#1a3a2a]/60">
          <a href="/termos" className="hover:text-[#1a3a2a] transition-colors">{t('terms')}</a>
          <a href="/privacidade" className="hover:text-[#1a3a2a] transition-colors">{t('privacy')}</a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
