import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_CONVERSATIONS = 100

// GET /api/coach/conversations — list the user's saved coach threads.
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('coach_conversations')
    .select('id, title, archived, last_message_at, created_at')
    .eq('user_id', user.id)
    .eq('archived', false)
    .order('last_message_at', { ascending: false })
    .limit(MAX_CONVERSATIONS)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversations: data ?? [] })
}

// POST /api/coach/conversations — start a new thread (optionally titled).
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const rawTitle = typeof body?.title === 'string' ? body.title.trim().slice(0, 200) : null

  const { data, error } = await supabase
    .from('coach_conversations')
    .insert({ user_id: user.id, title: rawTitle })
    .select('id, title, archived, last_message_at, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Falha ao criar conversa.' }, { status: 500 })
  }

  return NextResponse.json({ conversation: data })
}
