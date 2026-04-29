import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/**
 * Service-role client. Bypasses RLS — use ONLY in trusted server contexts
 * (webhooks, cron handlers). Never expose to the browser.
 */
export function createServiceClient(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service env not set')
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}
