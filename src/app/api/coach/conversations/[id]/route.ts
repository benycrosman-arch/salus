import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_MESSAGES = 200

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/coach/conversations/[id] — the conversation + its full turn history.
export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: conversation, error: convError } = await supabase
    .from('coach_conversations')
    .select('id, title, archived, last_message_at, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (convError) return NextResponse.json({ error: convError.message }, { status: 500 })
  if (!conversation) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })

  const { data: messages, error: msgError } = await supabase
    .from('coach_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(MAX_MESSAGES)

  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 })

  return NextResponse.json({ conversation, messages: messages ?? [] })
}

// PATCH /api/coach/conversations/[id] — rename or archive.
export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const patch: Record<string, unknown> = {}
  if (typeof body?.title === 'string') patch.title = body.title.trim().slice(0, 200)
  if (typeof body?.archived === 'boolean') patch.archived = body.archived
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('coach_conversations')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, title, archived, last_message_at, created_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })

  return NextResponse.json({ conversation: data })
}

// DELETE /api/coach/conversations/[id] — remove a thread (cascades messages).
export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('coach_conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
