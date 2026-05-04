"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { track } from "@/lib/posthog"

interface Props {
  userId: string
  userCreatedAt: string | null
  /** ISO timestamp from profiles.ai_goals_generated_at, or null if AI hasn't run. */
  aiGoalsGeneratedAt: string | null
  /** Whether profile has enough data to even attempt AI personalization. If
   *  false, suppress the badge so we don't show a forever-spinner. */
  profileComplete: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000
const RETENTION_MARKERS: Array<{ day: number; event: "dashboard_opened_d1" | "dashboard_opened_d7" | "dashboard_opened_d30" }> = [
  { day: 1, event: "dashboard_opened_d1" },
  { day: 7, event: "dashboard_opened_d7" },
  { day: 30, event: "dashboard_opened_d30" },
]

function todayKey(prefix: string): string {
  const d = new Date()
  return `${prefix}_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function fireOnceToday(prefix: string, fire: () => void) {
  if (typeof window === "undefined") return
  const key = todayKey(prefix)
  try {
    if (window.localStorage.getItem(key)) return
    window.localStorage.setItem(key, "1")
  } catch {
    // localStorage disabled — fire anyway, occasional dupes are fine
  }
  fire()
}

export function DashboardEngagement({ userId, userCreatedAt, aiGoalsGeneratedAt, profileComplete }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [generatedAt, setGeneratedAt] = useState<string | null>(aiGoalsGeneratedAt)
  const [justArrived, setJustArrived] = useState(false)

  // ─── Retention analytics ───────────────────────────────────────────
  useEffect(() => {
    fireOnceToday("salus_evt_dashboard_opened", () => track("dashboard_opened"))

    if (!userCreatedAt) return
    const signup = new Date(userCreatedAt).getTime()
    if (!Number.isFinite(signup)) return
    const daysSinceSignup = Math.floor((Date.now() - signup) / DAY_MS)
    for (const marker of RETENTION_MARKERS) {
      if (daysSinceSignup === marker.day) {
        fireOnceToday(`salus_evt_${marker.event}`, () =>
          track(marker.event, { days_since_signup: daysSinceSignup }),
        )
      }
    }
  }, [userCreatedAt])

  // ─── Goals personalization badge: poll until it arrives ────────────
  useEffect(() => {
    if (generatedAt) return
    if (!profileComplete) return
    if (userCreatedAt) {
      const ageMs = Date.now() - new Date(userCreatedAt).getTime()
      if (Number.isFinite(ageMs) && ageMs > DAY_MS) return
    }

    let cancelled = false
    let attempts = 0
    const maxAttempts = 18 // 18 × 5s = 90s

    const tick = async () => {
      if (cancelled) return
      attempts++
      const { data } = await supabase
        .from("profiles")
        .select("ai_goals_generated_at")
        .eq("id", userId)
        .maybeSingle()
      if (cancelled) return
      const arrived = data?.ai_goals_generated_at ?? null
      if (arrived) {
        setGeneratedAt(arrived)
        setJustArrived(true)
        track("personalized_goals_ready", { polled_attempts: attempts })
        router.refresh()
        setTimeout(() => {
          if (!cancelled) setJustArrived(false)
        }, 4000)
        return
      }
      if (attempts < maxAttempts) {
        setTimeout(tick, 5000)
      }
    }

    const initial = setTimeout(tick, 2000)
    return () => {
      cancelled = true
      clearTimeout(initial)
    }
  }, [generatedAt, profileComplete, userCreatedAt, userId, router, supabase])

  if (!generatedAt && profileComplete) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl bg-[#1a3a2a]/5 px-4 py-3 ring-1 ring-[#1a3a2a]/15">
        <Sparkles className="w-4 h-4 text-[#1a3a2a] animate-pulse shrink-0" />
        <p className="text-xs text-[#1a3a2a] font-body">
          <span className="font-semibold">Personalizando suas metas…</span>
          <span className="text-[#1a3a2a]/60"> Geralmente leva uns 10–20 segundos.</span>
        </p>
      </div>
    )
  }

  if (justArrived) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl bg-[#4a7c4a]/10 px-4 py-3 ring-1 ring-[#4a7c4a]/20 animate-in fade-in duration-500">
        <CheckCircle2 className="w-4 h-4 text-[#4a7c4a] shrink-0" />
        <p className="text-xs text-[#1a3a2a] font-body font-semibold">Suas metas foram personalizadas ✨</p>
      </div>
    )
  }

  return null
}
