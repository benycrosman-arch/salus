import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

/**
 * Calls the check_rate_limit RPC. Returns false if user is over their daily
 * (default 50/24h) or per-minute (10/60s) limit.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", { p_user_id: userId })
  if (error) {
    console.error("check_rate_limit RPC failed:", error.message)
    // Fail closed when the rate limiter itself errors out — refuse the request
    // rather than letting traffic through unmetered.
    return false
  }
  return data === true
}
