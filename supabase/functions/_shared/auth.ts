import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

export type AuthedUser = {
  id: string
  email: string | null
}

export type AuthSuccess = { ok: true; user: AuthedUser; supabase: SupabaseClient }
export type AuthFailure = { ok: false; status: 401 | 503; error: string }

/**
 * Verifies the caller's JWT against Supabase Auth.
 * Returns a SupabaseClient scoped to that user's RLS context.
 */
export async function authenticate(req: Request): Promise<AuthSuccess | AuthFailure> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  if (!supabaseUrl || !anonKey) {
    return { ok: false, status: 503, error: "Backend not configured" }
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing bearer token" }
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { ok: false, status: 401, error: "Invalid or expired session" }
  }

  return {
    ok: true,
    user: { id: user.id, email: user.email ?? null },
    supabase,
  }
}

/**
 * Service-role client — bypasses RLS. Used for inserts into ai_usage_log
 * and abuse_reports which have insert blocked for clients.
 */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
