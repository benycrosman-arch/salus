import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getProStatus } from '@/lib/pro'

// Returns the current user's Pro / trial state. The client hook polls this
// (or refetches on focus) so paywalls can fire the moment the trial expires.
export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ isPro: false, source: 'none' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at, plan, subscription_status, subscription_expires_at, role')
    .eq('id', user.id)
    .maybeSingle()

  const status = getProStatus(profile)
  return NextResponse.json(
    {
      isPro: status.isPro,
      source: status.source,
      trialActive: status.trialActive,
      trialEndsAt: status.trialEndsAt?.toISOString() ?? null,
      trialDaysLeft: status.trialDaysLeft,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
