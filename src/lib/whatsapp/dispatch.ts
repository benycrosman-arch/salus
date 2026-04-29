import type { SupabaseClient } from '@supabase/supabase-js'
import { sendMessage } from '@/lib/chatwoot/client'
import type { WhatsAppConnection } from './types'

export interface DispatchInput {
  supabase: SupabaseClient
  conn: WhatsAppConnection
  content: string
  source: string
  templateName?: string
  templateParams?: Record<string, string>
  metadata?: Record<string, unknown>
}

export interface DispatchResult {
  ok: boolean
  error?: string
  mocked?: boolean
}

/**
 * Single outbound path. Sends via Chatwoot (or mock), then mirrors the message
 * to whatsapp_messages so the agent has it in context next turn.
 */
export async function dispatchOutbound(input: DispatchInput): Promise<DispatchResult> {
  const { supabase, conn, content, source, templateName, templateParams, metadata } = input

  if (conn.status !== 'verified') {
    return { ok: false, error: `Connection status ${conn.status}, refusing to send` }
  }

  const sent = await sendMessage({
    contactId: conn.chatwoot_contact_id ?? undefined,
    conversationId: conn.chatwoot_conversation_id ?? undefined,
    content,
    templateName,
    templateParams,
  })

  if (!sent.ok) {
    return { ok: false, error: sent.error }
  }

  // Persist conversation id if we just discovered it.
  if (sent.conversationId && sent.conversationId !== conn.chatwoot_conversation_id) {
    await supabase
      .from('whatsapp_connections')
      .update({ chatwoot_conversation_id: sent.conversationId })
      .eq('user_id', conn.user_id)
  }

  await supabase.from('whatsapp_messages').insert({
    user_id: conn.user_id,
    direction: 'outbound',
    content,
    source,
    chatwoot_message_id: sent.messageId ?? null,
    metadata: { templateName, templateParams, mocked: sent.mocked, ...metadata },
  })

  return { ok: true, mocked: sent.mocked }
}
