import { NextResponse, type NextRequest } from 'next/server'
import { isWhatsAppFeatureEnabled } from '@/lib/whatsapp/feature-flag'
import { createServiceClient } from '@/lib/supabase/service'
import { loadUserContext } from '@/lib/whatsapp/context'
import { generateReply } from '@/lib/whatsapp/agent'
import { dispatchOutbound } from '@/lib/whatsapp/dispatch'
import {
  analyzeMealFromImage,
  analyzeMealFromText,
  fetchInboundImage,
  persistMealLog,
  formatMealReply,
  errorReply,
} from '@/lib/whatsapp/meal-log'
import { normalizeE164 } from '@/lib/whatsapp/phone'
import type { WhatsAppConnection } from '@/lib/whatsapp/types'

export const dynamic = 'force-dynamic'

/**
 * Z-API "ReceivedCallback" webhook payload (the relevant subset).
 * Z-API sends every event type to the configured webhook URL — we filter
 * to just inbound user messages and ignore everything else (status updates,
 * read receipts, our own outbound echoes via fromMe=true, etc.).
 */
interface ZapiInboundPayload {
  type?: string
  fromMe?: boolean
  isGroup?: boolean
  phone?: string
  senderName?: string
  messageId?: string
  text?: { message?: string }
  image?: { imageUrl?: string; caption?: string; mimeType?: string }
  audio?: unknown
  video?: unknown
  document?: unknown
  // Z-API also nests payload under "message" in some configs.
  message?: { text?: string; type?: string; imageUrl?: string; caption?: string }
}

export async function POST(request: NextRequest) {
  if (!isWhatsAppFeatureEnabled()) {
    return NextResponse.json({ ok: false, reason: 'feature_disabled' }, { status: 503 })
  }

  // Z-API doesn't HMAC-sign webhooks. Their recommended security is to require
  // the same Client-Token header back on the inbound, so we can verify the
  // request actually came from our instance. In dev (mock) we skip the check.
  const expectedClientToken = process.env.ZAPI_CLIENT_TOKEN
  if (expectedClientToken && process.env.NODE_ENV === 'production') {
    const sentClientToken = request.headers.get('client-token') || request.headers.get('Client-Token')
    if (sentClientToken !== expectedClientToken) {
      return NextResponse.json({ ok: false, reason: 'bad_client_token' }, { status: 401 })
    }
  }

  let event: ZapiInboundPayload
  try {
    event = (await request.json()) as ZapiInboundPayload
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_payload' }, { status: 400 })
  }

  // Only react to inbound user messages from 1:1 chats.
  if (event.fromMe || event.isGroup) {
    return NextResponse.json({ ok: true, ignored: true })
  }
  if (event.type && !['ReceivedCallback', 'message-received', 'PresenceChatCallback'].includes(event.type)) {
    // Ignore status callbacks, delivery receipts, etc.
    if (event.type !== 'ReceivedCallback') {
      return NextResponse.json({ ok: true, ignored: true, type: event.type })
    }
  }

  const text = (event.text?.message ?? event.message?.text ?? '').trim()
  const imageUrl = event.image?.imageUrl ?? event.message?.imageUrl ?? null
  const caption = event.image?.caption ?? event.message?.caption ?? ''
  const phoneRaw = event.phone ?? null
  const phone = phoneRaw ? normalizeE164(phoneRaw) : null

  if (!phone || (!text && !imageUrl)) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const supabase = createServiceClient()

  // Resolve the connection by phone (Z-API's only stable identifier).
  const { data: connRow } = await supabase
    .from('whatsapp_connections')
    .select('*')
    .eq('phone_e164', phone)
    .maybeSingle()
  let conn = (connRow as WhatsAppConnection) ?? null

  // Persist the inbound regardless — useful for support even if user not linked.
  if (conn) {
    await supabase.from('whatsapp_messages').insert({
      user_id: conn.user_id,
      direction: 'inbound',
      content: text || (imageUrl ? '[image]' : ''),
      source: 'user',
      zapi_message_id: event.messageId ?? null,
      metadata: { phone, hasImage: !!imageUrl, senderName: event.senderName ?? null },
    })

    // Refresh service window (still useful as a "last contact" timestamp).
    const lastMessageAt = new Date().toISOString()
    await supabase
      .from('whatsapp_connections')
      .update({ last_message_at: lastMessageAt })
      .eq('user_id', conn.user_id)
    conn = { ...conn, last_message_at: lastMessageAt }
  }

  if (!conn) {
    // Unknown sender — don't reply automatically.
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
  if (imageUrl) {
    try {
      const fetched = await fetchInboundImage(imageUrl)
      if (!fetched) {
        await dispatchOutbound({ supabase, conn, content: errorReply(locale), source: 'meal_log_image_fetch_failed' })
        return NextResponse.json({ ok: true, meal_logged: false, reason: 'image_fetch_failed' })
      }
      const analysisInput = (caption || text).trim() || null
      const analysis = await analyzeMealFromImage(fetched.base64, fetched.mediaType, analysisInput, locale)
      if (analysis?.isMeal && analysis.foods.length > 0) {
        const persisted = await persistMealLog({
          supabase,
          userId: conn.user_id,
          analysis,
          photoUrl: imageUrl,
          notes: analysisInput,
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
      // Photo received but no meal detected — fall through to chat.
    } catch (err) {
      console.error('[zapi] photo meal-log failed', err)
      await dispatchOutbound({ supabase, conn, content: errorReply(locale), source: 'meal_log_photo_failed' })
      return NextResponse.json({ ok: true, meal_logged: false, reason: 'photo_analysis_failed' })
    }
  } else if (text.length > 6) {
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
    } catch (err) {
      console.error('[zapi] text meal-log failed (continuing to chat)', err)
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
    const result = await generateReply(ctx, text || (imageUrl ? '[imagem recebida sem texto]' : ''))
    reply = result.text
    usage = result.usage
  } catch (err) {
    console.error('[zapi] generateReply failed', err)
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
