"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Patient-side companion of PacientesRealtimeRefresher.
 *
 * Subscribes to changes that affect what the patient should see on the
 * dashboard:
 *   - nutri_patient_links rows where they're the patient (link goes from
 *     pending to active when they accept; flips to ended when revoked)
 *   - patient_goals rows the nutri set/updated for them
 *
 * On any change we call router.refresh(). Server components re-fetch with
 * the now-current state. Cheap because the patient dashboard is one user's
 * data, not a list.
 */
export function PatientRealtimeRefresher({ patientId }: { patientId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let pendingRefresh = false
    const triggerRefresh = () => {
      if (pendingRefresh) return
      pendingRefresh = true
      queueMicrotask(() => {
        pendingRefresh = false
        router.refresh()
      })
    }

    const channel = supabase
      .channel(`patient-dashboard:${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "nutri_patient_links",
          filter: `patient_id=eq.${patientId}`,
        },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "patient_goals",
          filter: `patient_id=eq.${patientId}`,
        },
        triggerRefresh,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [patientId, router])

  return null
}
