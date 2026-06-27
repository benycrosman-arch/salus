import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DEFAULTS = { reminders_enabled: true, timezone: 'America/Sao_Paulo' }

// GET /api/coach/settings — reminder prefs (lazily defaulted, never auto-created).
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('coach_settings')
    .select('reminders_enabled, timezone')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data ?? DEFAULTS })
}

// PATCH /api/coach/settings — upsert reminder prefs. This is what flips a user
// into the coach-reminders cron's eligible set.
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const patch: Record<string, unknown> = { user_id: user.id }
  if (typeof body?.reminders_enabled === 'boolean') patch.reminders_enabled = body.reminders_enabled
  if (typeof body?.timezone === 'string' && body.timezone.length <= 64) patch.timezone = body.timezone

  const { data, error } = await supabase
    .from('coach_settings')
    .upsert(patch, { onConflict: 'user_id' })
    .select('reminders_enabled, timezone')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Falha ao salvar.' }, { status: 500 })
  }
  return NextResponse.json({ settings: data })
}
