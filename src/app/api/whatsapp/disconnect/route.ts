import { NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import { isWhatsAppFeatureEnabled } from '@/lib/whatsapp/feature-flag'

export const dynamic = 'force-dynamic'

export async function POST() {
  if (!isWhatsAppFeatureEnabled()) {
    return NextResponse.json({ error: 'feature_disabled' }, { status: 503 })
  }

  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const { error } = await supabase
    .from('whatsapp_connections')
    .update({ status: 'disabled' })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
