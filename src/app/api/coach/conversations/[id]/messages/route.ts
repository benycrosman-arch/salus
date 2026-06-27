import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCoachReply, type CoachTurn } from '@/lib/coach/engine'

// Anthropic SDK needs the Node runtime, and Opus/Sonnet replies can take a
// few seconds, so bump the function timeout.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_CONTENT_LEN = 4000

function deriveTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= 60 ? clean : `${clean.slice(0, 57)}…`
}

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/coach/conversations/[id]/messages
// Persists the user's turn, asks the coach, persists the reply, returns both.
export async function POST(request: NextRequest, ctx: RouteContext) {
  const { id: conversationId } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  if (!content) {
    return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 })
  }
  if (content.length > MAX_CONTENT_LEN) {
    return NextResponse.json(
      { error: `A mensagem excede o limite de ${MAX_CONTENT_LEN} caracteres.` },
      { status: 400 },
    )
  }

  // Ownership + load history in one pass.
  const { data: conversation } = await supabase
    .from('coach_conversations')
    .select('id, title')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!conversation) {
    return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })
  }

  const { data: priorRows } = await supabase
    .from('coach_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(50)
  const history = (priorRows ?? []) as CoachTurn[]

  // Persist the user's turn first so it isn't lost if the model call fails.
  const { data: userMsg, error: userErr } = await supabase
    .from('coach_messages')
    .insert({ conversation_id: conversationId, user_id: user.id, role: 'user', content })
    .select('id, role, content, created_at')
    .single()
  if (userErr || !userMsg) {
    return NextResponse.json({ error: userErr?.message ?? 'Falha ao enviar.' }, { status: 500 })
  }

  // Name the thread off the first message.
  if (!conversation.title) {
    await supabase
      .from('coach_conversations')
      .update({ title: deriveTitle(content) })
      .eq('id', conversationId)
  }

  let reply
  try {
    reply = await generateCoachReply({
      supabase,
      userId: user.id,
      history,
      inboundText: content,
    })
  } catch (err) {
    console.error('[coach] reply generation failed', err)
    // The user turn is saved; surface a soft error so the UI can retry.
    return NextResponse.json(
      { userMessage: userMsg, error: 'O coach está indisponível agora. Tente de novo em instantes.' },
      { status: 503 },
    )
  }

  const replyText = reply.text?.trim() || 'Desculpa, não consegui responder agora. Tenta de novo?'

  const { data: assistantMsg, error: assistantErr } = await supabase
    .from('coach_messages')
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: 'assistant',
      content: replyText,
      metadata: reply.usage ?? null,
    })
    .select('id, role, content, created_at')
    .single()
  if (assistantErr || !assistantMsg) {
    return NextResponse.json({ error: assistantErr?.message ?? 'Falha ao salvar resposta.' }, { status: 500 })
  }

  // Bump the thread so it sorts to the top of the history list.
  await supabase
    .from('coach_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  return NextResponse.json({ userMessage: userMsg, assistantMessage: assistantMsg })
}
