import type { SupabaseClient } from '@supabase/supabase-js'
import { sendText } from '@/lib/zapi/client'
import type { WhatsAppConnection } from './types'

export interface DispatchInput {
  supabase: SupabaseClient
  conn: WhatsAppConnection
  content: string
  source: string
  metadata?: Record<string, unknown>
}

export interface DispatchResult {
  ok: boolean
  error?: string
  mocked?: boolean
}

/**
 * Single outbound path. Sends via Z-API (or mock), then mirrors the message
 * to whatsapp_messages so the agent has it in context next turn.
 *
 * Z-API has no 24h service window or template approval — it sends free-form
 * text any time. The cost of that simplicity is account-ban risk, which the
 * caller accepted when picking this provider.
 */
export async function dispatchOutbound(input: DispatchInput): Promise<DispatchResult> {
  const { supabase, conn, content, source, metadata } = input

  if (conn.status !== 'verified') {
    return { ok: false, error: `Connection status ${conn.status}, refusing to send` }
  }

  const sent = await sendText({
    phoneE164: conn.phone_e164,
    message: content,
  })

  if (!sent.ok) {
    return { ok: false, error: sent.error }
  }

  await supabase.from('whatsapp_messages').insert({
    user_id: conn.user_id,
    direction: 'outbound',
    content,
    source,
    zapi_message_id: sent.messageId ?? null,
    metadata: { mocked: sent.mocked, ...metadata },
  })

  return { ok: true, mocked: sent.mocked }
}
