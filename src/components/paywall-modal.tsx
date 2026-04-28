'use client'

import { useEffect } from 'react'
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

const PLANS = [
  { id: 'annual', title: 'Anual', price: 'R$ 590/ano', subtitle: 'Só R$ 49,17/mês', badge: '17% OFF' },
  { id: 'monthly', title: 'Mensal', price: 'R$ 59/mês' },
]

export function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  useEffect(() => {
    if (isOpen) track("paywall_viewed")
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl border-[#e4ddd4] bg-white p-0 overflow-hidden">
        <DialogTitle className="sr-only">Salus Pro — baixe o app</DialogTitle>

        {/* Header */}
        <div className="bg-gradient-to-b from-[#faf8f4] to-white px-8 pt-8 pb-6 text-center">
          <p className="font-serif text-lg italic text-[#1a3a2a] mb-4">Salus</p>
          <h2 className="text-2xl font-bold text-[#1a3a2a]">Nutrição inteligente</h2>
          <p className="mt-2 text-sm text-[#1a3a2a]/60">
            Análises e planos guiados por IA no seu ritmo
          </p>
          <div className="mt-6 flex justify-center">
            <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-[#4a7c4a]/10 via-[#c4614a]/10 to-[#c8a538]/10 flex items-center justify-center">
              <div className="text-5xl">🥗</div>
            </div>
          </div>
        </div>

        {/* Plans (read-only — conversão real acontece no app via IAP) */}
        <div className="px-6 pb-4 space-y-2.5">
          {PLANS.map((plan) => {
            const isAnnual = plan.id === 'annual'
            return (
              <div
                key={plan.id}
                className={`relative w-full rounded-2xl border-2 px-5 py-4 ${
                  isAnnual ? 'border-[#4a7c4a] bg-[#4a7c4a]/5' : 'border-[#e4ddd4] bg-white'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-[#4a7c4a] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                    {plan.badge}
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isAnnual ? 'bg-[#4a7c4a]' : 'border-2 border-[#e4ddd4]'
                    }`}
                  >
                    {isAnnual && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <p className="text-base font-bold text-[#1a3a2a]">{plan.title}</p>
                      {plan.subtitle && (
                        <p className="text-xs text-[#1a3a2a]/60 mt-0.5">{plan.subtitle}</p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[#1a3a2a]">{plan.price}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTAs: baixar app */}
        <div className="px-6 pb-3 space-y-2.5">
          <p className="text-center text-xs text-[#1a3a2a]/60 mb-1">
            A assinatura está no app iOS e Android
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              asChild
              className="h-12 rounded-2xl bg-[#1a3a2a] font-semibold text-white hover:bg-[#1a3a2a]/90 transition-all"
            >
              <a href="#download" onClick={() => { track("paywall_cta_clicked", { platform: "ios" }); onClose() }}>
                <Apple className="w-4 h-4 mr-2" />
                iOS
              </a>
            </Button>
            <Button
              asChild
              className="h-12 rounded-2xl bg-[#1a3a2a] font-semibold text-white hover:bg-[#1a3a2a]/90 transition-all"
            >
              <a href="#download" onClick={() => { track("paywall_cta_clicked", { platform: "android" }); onClose() }}>
                <Smartphone className="w-4 h-4 mr-2" />
                Android
              </a>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-center gap-6 text-xs text-[#1a3a2a]/60">
          <a href="/termos" className="hover:text-[#1a3a2a] transition-colors">
            Termos
          </a>
          <a href="/privacidade" className="hover:text-[#1a3a2a] transition-colors">
            Privacidade
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
