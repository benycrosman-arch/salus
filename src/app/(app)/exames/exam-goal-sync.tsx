"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { callEdgeFunction } from "@/lib/ai-client"

interface Props {
  latestExamDate: string                    // YYYY-MM-DD
  goalsGeneratedAt: string | null           // ISO timestamp, or null if goals never generated
}

// Fires `ai-personalize-goals` once when the latest exam is newer than the
// last AI goal generation. That keeps the dashboard macros/micros aligned
// with the marker readings the paciente is looking at on this page.
// Cooldown is enforced server-side; we just trigger.
export function ExamGoalSync({ latestExamDate, goalsGeneratedAt }: Props) {
  const router = useRouter()
  const triggered = useRef(false)

  useEffect(() => {
    if (triggered.current) return

    const examTs = new Date(`${latestExamDate}T00:00:00`).getTime()
    const goalsTs = goalsGeneratedAt ? new Date(goalsGeneratedAt).getTime() : 0

    // Only regenerate if exam is newer than goals (or goals never existed).
    if (goalsTs >= examTs) return

    triggered.current = true
    callEdgeFunction("ai-personalize-goals", { force: true })
      .then(() => {
        // Refresh the server component so the "ativo no plano" badges and
        // rationale reflect the new goals.
        router.refresh()
      })
      .catch(() => {
        // Silent — the dashboard has a Mifflin-St Jeor fallback that still
        // uses the lab signals via calculateGoals(), so the user is not broken.
      })
  }, [latestExamDate, goalsGeneratedAt, router])

  return null
}
