import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

export type KillSwitchResult =
  | { allowed: true }
  | { allowed: false; status: 403 | 503; error: string }

/**
 * Two layers of kill switch:
 * 1. Per-user — `profiles.ai_enabled = false` or `account_status = 'suspended'`
 * 2. Global  — `app_config.ai_globally_enabled` not 'true'
 */
export async function checkKillSwitches(
  supabase: SupabaseClient,
  userId: string,
): Promise<KillSwitchResult> {
  const [profileRes, configRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("ai_enabled, account_status")
      .eq("id", userId)
      .single(),
    supabase
      .from("app_config")
      .select("value")
      .eq("key", "ai_globally_enabled")
      .single(),
  ])

  const profile = profileRes.data
  if (!profile || profile.ai_enabled === false || profile.account_status === "suspended") {
    return { allowed: false, status: 403, error: "AI access disabled" }
  }

  const globalValue = configRes.data?.value
  if (globalValue !== "true") {
    return { allowed: false, status: 503, error: "AI features temporarily unavailable" }
  }

  return { allowed: true }
}
