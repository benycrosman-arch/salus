import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQuotaUsage, FEATURE_QUOTAS, type FeatureKey } from '@/lib/feature-quota'

const VALID_KEYS = Object.keys(FEATURE_QUOTAS) as FeatureKey[]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key') as FeatureKey | null

  if (!key || !VALID_KEYS.includes(key)) {
    return NextResponse.json({ error: 'invalid_key' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const result = await getQuotaUsage(supabase, user.id, key)
  // JSON can't serialize Infinity → send null and let the client treat it as unlimited.
  const payload = {
    tier: result.tier,
    used: result.used,
    limit: result.limit,
    remaining: Number.isFinite(result.remaining) ? result.remaining : null,
    blocked: result.blocked,
    window: result.window,
  }
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
}
