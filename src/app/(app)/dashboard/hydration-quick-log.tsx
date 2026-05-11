"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Droplet } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface Props {
  goalMl: number
  consumedMl: number
  emptyLabel: string
}

const QUICK_AMOUNTS_ML = [250, 500, 750]

export function HydrationQuickLog({ goalMl, consumedMl, emptyLabel }: Props) {
  const router = useRouter()
  const t = useTranslations('dashboard')
  const [pending, setPending] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  const pct = goalMl > 0
    ? Math.min(100, Math.round((consumedMl / goalMl) * 100))
    : 0

  async function logAmount(ml: number) {
    setPending(ml)
    try {
      const res = await fetch('/api/hydration/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ml }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to log hydration')
      }
      toast.success(t('hydrationLogged', { value: ml }))
      startTransition(() => router.refresh())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/[0.04] p-5">
      <div className="flex gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
          <Droplet className="h-4 w-4 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1a3a2a] mb-1">
            {t('hydrationGoal', { value: (goalMl / 1000).toFixed(1) })}
          </p>
          <p className="text-sm text-[#1a3a2a]/60 leading-relaxed">
            {consumedMl > 0
              ? t('consumedTodayMl', { value: (consumedMl / 1000).toFixed(1), pct })
              : emptyLabel}
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-sky-500/10 overflow-hidden">
        <div
          className="h-full bg-sky-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {QUICK_AMOUNTS_ML.map((ml) => (
          <button
            key={ml}
            type="button"
            onClick={() => logAmount(ml)}
            disabled={pending !== null}
            className="rounded-xl bg-sky-500/5 hover:bg-sky-500/10 disabled:opacity-50 disabled:cursor-not-allowed py-2 text-xs font-semibold text-sky-700 transition-colors"
          >
            {pending === ml ? '…' : `+${ml} ml`}
          </button>
        ))}
      </div>
    </div>
  )
}
