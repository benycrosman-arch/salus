'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Apple, Smartphone, Check, Tag, X, Loader2 } from '@/components/icons'
import { track } from '@/lib/posthog'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
}

type ConsumerPlan = 'essencial' | 'pro'

interface AppliedCoupon {
  code: string
  description: string | null
  discountType: 'percent' | 'fixed'
  discountValue: number
}

// Apply a discount to a localized price string ("R$ 69", "15 €", "R$ 41,58")
// while keeping its currency prefix/suffix and decimal separator. Display
// only — /api/coupons/validate stays the source of truth for validity.
function discountedPrice(price: string, coupon: AppliedCoupon): string | null {
  const match = price.match(/[\d.,]+/)
  if (!match) return null
  const raw = match[0]
  const usesComma = raw.includes(',')
  const n = parseFloat(raw.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'))
  if (!isFinite(n)) return null

  let value = coupon.discountType === 'percent' ? n * (1 - coupon.discountValue / 100) : n - coupon.discountValue
  if (value < 0) value = 0

  const out = Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace('.', usesComma ? ',' : '.')
  return price.replace(raw, out)
}

export function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const t = useTranslations('paywall')
  const tp = useTranslations('pricing')
  const [selected, setSelected] = useState<ConsumerPlan>('pro')

  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (isOpen) track('paywall_viewed')
  }, [isOpen])

  async function applyCoupon() {
    const code = couponInput.trim()
    if (!code || applying) return
    setApplying(true)
    setCouponError(null)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, plan: selected }),
      })
      const data = await res.json()
      if (res.ok && data.valid) {
        setCoupon({
          code: data.code,
          description: data.description ?? null,
          discountType: data.discountType,
          discountValue: data.discountValue,
        })
        setCouponInput('')
        track('paywall_coupon_applied', { code: data.code, plan: selected })
      } else {
        setCoupon(null)
        setCouponError(t('couponInvalid'))
        track('paywall_coupon_rejected', { code, plan: selected })
      }
    } catch {
      setCoupon(null)
      setCouponError(t('couponError'))
    } finally {
      setApplying(false)
    }
  }

  function removeCoupon() {
    setCoupon(null)
    setCouponError(null)
    setCouponInput('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl border-[#e4ddd4] bg-white p-0 overflow-hidden">
        <DialogTitle className="sr-only">{t('srTitle')}</DialogTitle>

        {/* Header */}
        <div className="bg-gradient-to-b from-[#faf8f4] to-white px-8 pt-8 pb-6 text-center">
          <p className="font-serif text-lg italic text-[#1a3a2a] mb-3">{t('brand')}</p>
          <h2 className="font-serif text-3xl italic text-[#1a3a2a] tracking-tight">{t('headline')}</h2>
          <p className="mt-2 text-sm text-[#1a3a2a]/60">{t('subline')}</p>
        </div>

        {/* Plans (read-only — conversão real acontece no app via IAP) */}
        <div className="px-6 pb-4 space-y-2.5">
          {(['essencial', 'pro'] as const).map((plan) => {
            const isSelected = selected === plan
            const isPro = plan === 'pro'
            const basePrice = tp(`${plan}.price`)
            const newPrice = coupon ? discountedPrice(basePrice, coupon) : null
            return (
              <button
                key={plan}
                type="button"
                onClick={() => setSelected(plan)}
                aria-pressed={isSelected}
                aria-label={tp(`${plan}.name`)}
                className={`relative w-full text-left rounded-2xl border-2 px-5 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7c4a] focus-visible:ring-offset-2 ${
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
                      {newPrice && newPrice !== basePrice ? (
                        <p className="text-sm font-semibold">
                          <span className="text-[#1a3a2a]/40 line-through mr-1.5 font-normal">{basePrice}</span>
                          <span className="text-[#4a7c4a]">{newPrice}</span>
                        </p>
                      ) : (
                        <p className="text-sm font-semibold text-[#1a3a2a]">{basePrice}</p>
                      )}
                      <p className="text-[10px] text-[#1a3a2a]/50">{tp(`${plan}.period`)}</p>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Cupom de desconto */}
        <div className="px-6 pb-4">
          {coupon ? (
            <div className="flex items-center justify-between rounded-2xl border-2 border-[#4a7c4a]/40 bg-[#4a7c4a]/5 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="w-4 h-4 text-[#4a7c4a] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1a3a2a] truncate">
                    {t('couponApplied', { code: coupon.code })}
                  </p>
                  {coupon.description && (
                    <p className="text-xs text-[#1a3a2a]/60 truncate">{coupon.description}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={removeCoupon}
                aria-label={t('couponRemove')}
                className="ml-2 shrink-0 rounded-full p-1 text-[#1a3a2a]/50 hover:bg-[#1a3a2a]/5 hover:text-[#1a3a2a] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <label htmlFor="coupon" className="mb-1.5 block text-xs font-medium text-[#1a3a2a]/70">
                {t('couponLabel')}
              </label>
              <div className="flex gap-2">
                <input
                  id="coupon"
                  type="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon() } }}
                  placeholder={t('couponPlaceholder')}
                  className="flex-1 rounded-2xl border-2 border-[#e4ddd4] bg-white px-4 py-2.5 text-sm font-medium text-[#1a3a2a] uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal placeholder:text-[#1a3a2a]/40 focus-visible:outline-none focus-visible:border-[#4a7c4a]"
                />
                <Button
                  type="button"
                  onClick={applyCoupon}
                  disabled={!couponInput.trim() || applying}
                  className="h-auto rounded-2xl bg-[#4a7c4a] px-5 font-semibold text-white hover:bg-[#4a7c4a]/90 disabled:opacity-50"
                >
                  {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : t('couponApply')}
                </Button>
              </div>
              {couponError && (
                <p className="mt-1.5 text-xs text-red-600">{couponError}</p>
              )}
            </div>
          )}
        </div>

        {/* CTAs: baixar app */}
        <div className="px-6 pb-3 space-y-2.5">
          <p className="text-center text-xs text-[#1a3a2a]/60 mb-1">{t('appNote')}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              asChild
              className="h-12 rounded-2xl bg-[#1a3a2a] font-semibold text-white hover:bg-[#1a3a2a]/90 transition-all"
            >
              <a href="#download" onClick={() => { track('paywall_cta_clicked', { platform: 'ios', plan: selected, coupon: coupon?.code ?? null }); onClose() }}>
                <Apple className="w-4 h-4 mr-2" />
                {t('ios')}
              </a>
            </Button>
            <Button
              asChild
              className="h-12 rounded-2xl bg-[#1a3a2a] font-semibold text-white hover:bg-[#1a3a2a]/90 transition-all"
            >
              <a href="#download" onClick={() => { track('paywall_cta_clicked', { platform: 'android', plan: selected, coupon: coupon?.code ?? null }); onClose() }}>
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
