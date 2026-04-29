import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { openCommission, closeCommission } from '@/lib/commissions'

/**
 * RevenueCat webhook receiver.
 * Configure in RC dashboard: https://app.revenuecat.com/projects/.../integrations/webhooks
 * Set Authorization header in RC to: Bearer <REVENUECAT_WEBHOOK_SECRET>
 *
 * RC sends `app_user_id` which we map to our Supabase user id.
 * On the native app side, call Purchases.logIn(supabaseUserId) so RC knows the user.
 */

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey)
}

type RCEvent = {
  type: string
  app_user_id: string
  original_app_user_id?: string
  product_id?: string
  entitlement_ids?: string[] | null
  period_type?: 'NORMAL' | 'TRIAL' | 'INTRO' | 'PROMOTIONAL'
  environment?: 'SANDBOX' | 'PRODUCTION'
  expiration_at_ms?: number | null
}

type RCWebhookBody = {
  event: RCEvent
  api_version: string
}

const ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
])

const INACTIVE_EVENTS = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'SUBSCRIPTION_PAUSED',
])

export async function POST(request: NextRequest) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: RCWebhookBody
  try {
    body = (await request.json()) as RCWebhookBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = body.event
  if (!event?.app_user_id) {
    return NextResponse.json({ error: 'Missing app_user_id' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ received: true, stored: false })
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    revenuecat_app_user_id: event.app_user_id,
  }

  if (ACTIVE_EVENTS.has(event.type)) {
    update.subscription_status = 'premium'
    update.subscription_product_id = event.product_id ?? null
    update.subscription_expires_at = event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null
  } else if (INACTIVE_EVENTS.has(event.type)) {
    update.subscription_status = 'free'
  } else {
    console.log(`Unhandled RC event: ${event.type}`)
    return NextResponse.json({ received: true, handled: false })
  }

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', event.app_user_id)

  if (error) {
    console.error('RC webhook DB error:', error)
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
  }

  // Commission ledger: open a row when a sub activates, close when it ends.
  // Failures here are logged but never fail the webhook (RC retries cause duplicates).
  let commissionResult: { ok: boolean; reason?: string; closed?: number } = { ok: false, reason: 'not_attempted' }
  try {
    if (ACTIVE_EVENTS.has(event.type)) {
      commissionResult = await openCommission({
        supabase,
        patientId: event.app_user_id,
        productId: event.product_id,
        sourceEvent: `rc:${event.type}`,
      })
    } else if (INACTIVE_EVENTS.has(event.type)) {
      commissionResult = await closeCommission({ supabase, patientId: event.app_user_id })
    }
  } catch (err) {
    console.error('RC webhook commission write error:', err)
  }

  return NextResponse.json({ received: true, commission: commissionResult })
}
