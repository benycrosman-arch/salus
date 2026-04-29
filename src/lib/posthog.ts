"use client"

import posthog from "posthog-js"

let initialized = false

export function initPostHog() {
  if (typeof window === "undefined" || initialized) return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"
  if (!key) return // analytics disabled in this env

  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // we capture manually in PostHogPageview to handle Next.js client routing
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: false,      // explicit events only — keeps payloads predictable
    disable_session_recording: false,
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") {
        ph.opt_out_capturing()
      }
    },
  })
  initialized = true
}

export { posthog }

/**
 * Track a domain event. Centralised so we keep a typed list of event names.
 */
export type SalusEvent =
  | "signup_started"
  | "signup_completed"
  | "login"
  | "logout"
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "role_picked"
  | "meal_scanned_photo"
  | "meal_scanned_text"
  | "meal_logged"
  | "ai_report_submitted"
  | "paywall_viewed"
  | "paywall_cta_clicked"
  | "feature_blocker_shown"
  | "feature_blocker_cta_clicked"
  | "data_exported"
  | "account_deleted"
  | "nutri_invite_sent"
  | "nutri_protocol_updated"

export function track(event: SalusEvent, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return
  if (!initialized) initPostHog()
  if (!initialized) return
  posthog.capture(event, properties)
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === "undefined" || !initialized) return
  posthog.identify(userId, traits)
}

export function resetIdentity() {
  if (typeof window === "undefined" || !initialized) return
  posthog.reset()
}
