import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Standard guard for Next.js API routes:
 *   - require an authenticated user
 *   - apply the same per-user rate limit as the Edge Functions
 *
 * Usage:
 *   const guard = await guardRequest()
 *   if (!guard.ok) return guard.response
 *   const { user, supabase } = guard
 */

export type GuardSuccess = {
  ok: true
  user: { id: string; email: string | null }
  supabase: SupabaseClient
}

export type GuardFailure = {
  ok: false
  response: NextResponse
}

export async function guardRequest(): Promise<GuardSuccess | GuardFailure> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: limitOk, error: limitError } = await supabase.rpc('check_rate_limit', {
    p_user_id: user.id,
  })
  if (limitError) {
    console.error('check_rate_limit failed:', limitError.message)
    return {
      ok: false,
      response: NextResponse.json({ error: 'Rate limit unavailable' }, { status: 503 }),
    }
  }
  if (limitOk !== true) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } },
      ),
    }
  }

  return {
    ok: true,
    user: { id: user.id, email: user.email ?? null },
    supabase,
  }
}
