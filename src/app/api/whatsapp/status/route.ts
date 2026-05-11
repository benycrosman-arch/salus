import { NextResponse, type NextRequest } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import { isWhatsAppFeatureEnabled } from '@/lib/whatsapp/feature-flag'
import { getProStatus } from '@/lib/pro'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isWhatsAppFeatureEnabled()) {
    return NextResponse.json({ enabled: false, reason: 'feature_disabled' }, { status: 200 })
  }

  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const [{ data: profile }, { data: conn }] = await Promise.all([
    supabase
      .from('profiles')
      .select('plan, subscription_status, subscription_expires_at, role, created_at')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('whatsapp_connections')
      .select(
        'phone_e164, status, timezone, nudge_lunch_enabled, nudge_dinner_enabled, nudge_recap_enabled, verified_at',
      )
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const pro = getProStatus(profile)

  return NextResponse.json({
    enabled: true,
    isPro: pro.isPro,
    proSource: pro.source,
    connection: conn ?? null,
  })
}

export async function PATCH(request: NextRequest) {
  if (!isWhatsAppFeatureEnabled()) {
    return NextResponse.json({ error: 'feature_disabled' }, { status: 503 })
  }
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const body = await request.json().catch(() => null)
  const updates: Record<string, unknown> = {}
  if (typeof body?.nudge_lunch_enabled === 'boolean') updates.nudge_lunch_enabled = body.nudge_lunch_enabled
  if (typeof body?.nudge_dinner_enabled === 'boolean') updates.nudge_dinner_enabled = body.nudge_dinner_enabled
  if (typeof body?.nudge_recap_enabled === 'boolean') updates.nudge_recap_enabled = body.nudge_recap_enabled
  if (typeof body?.timezone === 'string' && body.timezone.length < 64) updates.timezone = body.timezone

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_updates' }, { status: 400 })
  }

  const { error } = await supabase.from('whatsapp_connections').update(updates).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
