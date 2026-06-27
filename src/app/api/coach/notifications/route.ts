import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_NOTIFICATIONS = 50

// GET /api/coach/notifications — recent in-app reminders + unread count.
// The app calls this on open (and polls) to surface the bell badge.
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('coach_notifications')
    .select('id, kind, title, body, conversation_id, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(MAX_NOTIFICATIONS)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const notifications = data ?? []
  const unread = notifications.filter((n) => !n.read_at).length
  return NextResponse.json({ notifications, unread })
}

// POST /api/coach/notifications — mark read. Body: { ids?: string[], all?: true }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const now = new Date().toISOString()

  let query = supabase
    .from('coach_notifications')
    .update({ read_at: now })
    .eq('user_id', user.id)
    .is('read_at', null)

  if (Array.isArray(body?.ids) && body.ids.length > 0) {
    query = query.in('id', body.ids.slice(0, MAX_NOTIFICATIONS))
  } else if (body?.all !== true) {
    return NextResponse.json({ error: 'Informe ids[] ou all:true.' }, { status: 400 })
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
