import { NextResponse, type NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { isWhatsAppFeatureEnabled } from '@/lib/whatsapp/feature-flag'
import { createServiceClient } from '@/lib/supabase/service'
import { loadUserContext } from '@/lib/whatsapp/context'
import { generateReply } from '@/lib/whatsapp/agent'
import { dispatchOutbound } from '@/lib/whatsapp/dispatch'
import {
  analyzeMealFromImage,
  analyzeMealFromText,
  fetchChatwootImage,
  persistMealLog,
  formatMealReply,
  errorReply,
} from '@/lib/whatsapp/meal-log'
import type { WhatsAppConnection } from '@/lib/whatsapp/types'

export const dynamic = 'force-dynamic'

interface ChatwootAttachment {
  file_type?: string
  data_url?: string
  thumb_url?: string
  message_id?: number
}

interface ChatwootMessageEvent {
  event?: string
  message_type?: 'incoming' | 'outgoing' | string
  content?: string | null
  attachments?: ChatwootAttachment[]
  conversation?: { id: number; contact_inbox?: { contact_id?: number } }
  sender?: { id?: number; phone_number?: string | null }
}

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(signature.replace(/^sha256=/, ''), 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  if (!isWhatsAppFeatureEnabled()) {
    return NextResponse.json({ ok: false, reason: 'feature_disabled' }, { status: 503 })
  }

  const rawBody = await request.text()
  const secret = process.env.CHATWOOT_WEBHOOK_SECRET

  // Skip signature verification when running fully mocked (no secret set).
  // In production, secret MUST be set and signatures MUST verify.
  if (secret) {
    const sig = request.headers.get('x-chatwoot-signature') || request.headers.get('x-hub-signature-256')
    if (!verifySignature(rawBody, sig, secret)) {
      return NextResponse.json({ ok: false, reason: 'bad_signature' }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, reason: 'webhook_secret_missing' }, { status: 500 })
  }

  let event: ChatwootMessageEvent
  try {
    event = JSON.parse(rawBody) as ChatwootMessageEvent
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_payload' }, { status: 400 })
  }

  // Only react to inbound user messages.
  if (event.event !== 'message_created' || event.message_type !== 'incoming') {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const text = (event.content ?? '').trim()
  const contactId = event.conversation?.contact_inbox?.contact_id ?? event.sender?.id ?? null
  const phone = event.sender?.phone_number ?? null
  const conversationId = event.conversation?.id ?? null
  const imageAttachment = (event.attachments ?? []).find(
    (a) => (a.file_type ?? '').toLowerCase().startsWith('image') && !!a.data_url,
  )

  // We need a signal — text OR an image — and a contactId to attribute it to.
  if ((!text && !imageAttachment) || !contactId) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const supabase = createServiceClient()

  // Resolve the connection. Try contact_id, fall back to phone match.
  let conn: WhatsAppConnection | null = null
  {
    const { data } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('chatwoot_contact_id', contactId)
      .maybeSingle()
    conn = (data as WhatsAppConnection) ?? null
  }
  if (!conn && phone) {
    const { data } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('phone_e164', phone)
      .maybeSingle()
    conn = (data as WhatsAppConnection) ?? null
    if (conn && conn.chatwoot_contact_id !== contactId) {
      await supabase
        .from('whatsapp_connections')
        .update({ chatwoot_contact_id: contactId })
        .eq('user_id', conn.user_id)
    }
  }

  // Persist the inbound regardless — useful for support even if user not linked.
  if (conn) {
    await supabase.from('whatsapp_messages').insert({
      user_id: conn.user_id,
      direction: 'inbound',
      content: text || (imageAttachment ? '[image]' : ''),
      source: 'user',
      chatwoot_message_id: null,
      metadata: { contactId, conversationId, hasImage: !!imageAttachment },
    })

    // Refresh service window.
    const updates: Record<string, unknown> = { last_message_at: new Date().toISOString() }
    if (conversationId && conversationId !== conn.chatwoot_conversation_id) {
      updates.chatwoot_conversation_id = conversationId
    }
    await supabase.from('whatsapp_connections').update(updates).eq('user_id', conn.user_id)
    conn = { ...conn, last_message_at: updates.last_message_at as string, chatwoot_conversation_id: (updates.chatwoot_conversation_id as number | undefined) ?? conn.chatwoot_conversation_id }
  }

  if (!conn) {
    // Unknown sender. Don't reply automatically — let the human inbox handle it.
    return NextResponse.json({ ok: true, unknown_sender: true })
  }

  // STOP keyword opts out.
  if (/^(stop|parar|sair|cancelar)$/i.test(text)) {
    await supabase
      .from('whatsapp_connections')
      .update({ status: 'disabled' })
      .eq('user_id', conn.user_id)
    await dispatchOutbound({
      supabase,
      conn,
      content: 'Tudo bem, você foi removido das mensagens do Salus. Para reativar, é só voltar nas Configurações do app.',
      source: 'system_stop',
    })
    return NextResponse.json({ ok: true, disabled: true })
  }

  if (conn.status !== 'verified') {
    await dispatchOutbound({
      supabase,
      conn,
      content: 'Antes de começarmos: termine a verificação no app em Configurações > WhatsApp.',
      source: 'system_unverified',
    })
    return NextResponse.json({ ok: true, unverified: true })
  }

  const locale = 'pt' as const

  // ─── Meal-log path: image always tries to log; text only logs if intent matches. ───
  if (imageAttachment) {
    try {
      const fetched = await fetchChatwootImage(imageAttachment.data_url!)
      if (!fetched) {
        await dispatchOutbound({ supabase, conn, content: errorReply(locale), source: 'meal_log_image_fetch_failed' })
        return NextResponse.json({ ok: true, meal_logged: false, reason: 'image_fetch_failed' })
      }
      const analysis = await analyzeMealFromImage(fetched.base64, fetched.mediaType, text || null, locale)
      if (analysis?.isMeal && analysis.foods.length > 0) {
        const persisted = await persistMealLog({
          supabase,
          userId: conn.user_id,
          analysis,
          photoUrl: imageAttachment.data_url ?? null,
          notes: text || null,
        })
        if (persisted) {
          await dispatchOutbound({
            supabase,
            conn,
            content: formatMealReply(analysis, persisted, locale),
            source: 'meal_log_photo',
            metadata: { mealId: persisted.mealId, score: persisted.score },
          })
          return NextResponse.json({ ok: true, meal_logged: true, mealId: persisted.mealId, score: persisted.score })
        }
      }
      // Photo received but no meal detected (e.g. screenshot, blank). Fall through to chat.
    } catch (err) {
      console.error('[whatsapp] photo meal-log failed', err)
      await dispatchOutbound({ supabase, conn, content: errorReply(locale), source: 'meal_log_photo_failed' })
      return NextResponse.json({ ok: true, meal_logged: false, reason: 'photo_analysis_failed' })
    }
  } else if (text.length > 6) {
    // Text-only: try meal-log first; if isMeal=false, fall through to chat agent.
    try {
      const analysis = await analyzeMealFromText(text, locale)
      if (analysis?.isMeal && analysis.foods.length > 0) {
        const persisted = await persistMealLog({
          supabase,
          userId: conn.user_id,
          analysis,
          notes: text,
        })
        if (persisted) {
          await dispatchOutbound({
            supabase,
            conn,
            content: formatMealReply(analysis, persisted, locale),
            source: 'meal_log_text',
            metadata: { mealId: persisted.mealId, score: persisted.score },
          })
          return NextResponse.json({ ok: true, meal_logged: true, mealId: persisted.mealId, score: persisted.score })
        }
      }
      // Not a meal — fall through to the chat agent below.
    } catch (err) {
      console.error('[whatsapp] text meal-log failed (continuing to chat)', err)
    }
  }

  // ─── Default: AI coach chat reply. ───
  const ctx = await loadUserContext({
    supabase,
    userId: conn.user_id,
    timezone: conn.timezone,
    locale,
  })

  let reply: string
  let usage: Record<string, unknown> | undefined
  try {
    const result = await generateReply(ctx, text || (imageAttachment ? '[imagem recebida sem texto]' : ''))
    reply = result.text
    usage = result.usage
  } catch (err) {
    console.error('[whatsapp] generateReply failed', err)
    reply = 'Tive um soluço aqui agora — tenta de novo em alguns minutos. Se continuar, abre o app que eu te mostro tudo lá.'
    usage = { error: String(err) }
  }

  await dispatchOutbound({
    supabase,
    conn,
    content: reply,
    source: 'ai_agent',
    metadata: { usage },
  })

  return NextResponse.json({ ok: true })
}
