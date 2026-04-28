'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { Globe } from 'lucide-react'
import { setLocale } from '@/i18n/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const OPTIONS = [
  { value: 'pt' as const, labelKey: 'pt' },
  { value: 'en' as const, labelKey: 'en' },
]

interface Props {
  variant?: 'icon' | 'inline'
  className?: string
}

export function LanguageSwitcher({ variant = 'icon', className }: Props) {
  const t = useTranslations('language')
  const current = useLocale() as 'pt' | 'en'
  const [pending, start] = useTransition()

  const choose = (value: 'pt' | 'en') => {
    if (value === current) return
    start(async () => {
      await setLocale(value)
    })
  }

  if (variant === 'inline') {
    return (
      <div className={className}>
        <p className="text-sm font-medium text-[#1a3a2a] mb-2">{t('label')}</p>
        <div className="flex gap-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => choose(opt.value)}
              disabled={pending}
              className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                current === opt.value
                  ? 'border-[#1a3a2a] bg-[#1a3a2a] text-white'
                  : 'border-[#e4ddd4] bg-white text-[#1a3a2a] hover:border-[#1a3a2a]/40'
              } disabled:opacity-50`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('switchTo')}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[#1a3a2a]/70 hover:bg-[#1a3a2a]/5 hover:text-[#1a3a2a] transition-colors ${
          className ?? ''
        }`}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="uppercase tracking-wider">{current}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => choose(opt.value)}
            disabled={pending}
            className={current === opt.value ? 'bg-[#1a3a2a]/5 font-semibold' : ''}
          >
            {t(opt.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
