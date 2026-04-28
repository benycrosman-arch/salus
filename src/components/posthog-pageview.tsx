"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { initPostHog, posthog } from "@/lib/posthog"

/**
 * Captures pageview events on Next.js client-side route changes,
 * because PostHog's autocapture only fires on full page loads.
 */
export function PostHogPageview() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    initPostHog()
  }, [])

  useEffect(() => {
    if (!pathname) return
    const url = window.location.origin + pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "")
    posthog.capture?.("$pageview", { $current_url: url })
  }, [pathname, searchParams])

  return null
}
