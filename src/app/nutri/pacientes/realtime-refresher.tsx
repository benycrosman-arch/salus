"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Re-renders the server component when this nutri's links or invites change.
 *
 * Approach: subscribe to postgres_changes on the two relevant tables,
 * filtered by `nutri_id` server-side. On any insert/update/delete we call
 * `router.refresh()` which re-fetches the RSC data. We deliberately don't
 * touch local component state — the server query is the source of truth
 * and we trust it to give us the correct ordering / RLS-filtered view.
 *
 * Trade-offs intentionally taken:
 *   - `router.refresh()` is debounced via a microtask coalesce so a burst
 *     of three writes doesn't trigger three re-renders.
 *   - We pay one re-render per change rather than diffing rows locally.
 *     For < 50 patients per nutri this is cheap and dramatically simpler.
 *   - Subscription scoped per (nutriId) so each nutri only sees their own
 *     traffic.
 */
export function PacientesRealtimeRefresher({ nutriId }: { nutriId: string }) {
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
      .channel(`nutri-pacientes:${nutriId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "nutri_patient_links",
          filter: `nutri_id=eq.${nutriId}`,
        },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "nutri_invites",
          filter: `nutri_id=eq.${nutriId}`,
        },
        triggerRefresh,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [nutriId, router])

  return null
}
