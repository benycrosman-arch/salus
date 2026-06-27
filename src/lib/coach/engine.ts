import type { SupabaseClient } from '@supabase/supabase-js'
import { loadUserContext } from '@/lib/whatsapp/context'
import { generateReply, generateNudge, type ReplyResult } from '@/lib/whatsapp/agent'

/**
 * The in-app coach reuses the exact same agent that was built for WhatsApp
 * (grounded in the paciente's labs, goals, meals, streak and nutri guidance).
 * The only difference is the channel: instead of Z-API, turns live in
 * coach_conversations / coach_messages and reminders land as in-app
 * notifications. See migration 038_coach_chat.sql.
 */

export interface CoachTurn {
  role: 'user' | 'assistant'
  content: string
}

/** How many prior turns of the SAME conversation we replay into the model. */
const HISTORY_WINDOW = 12

/**
 * Generate the coach's reply to a new user message inside one conversation.
 * `history` is the conversation's prior turns (oldest → newest), NOT including
 * the new inbound message.
 */
export async function generateCoachReply(opts: {
  supabase: SupabaseClient
  userId: string
  timezone?: string
  locale?: 'pt' | 'en'
  history: CoachTurn[]
  inboundText: string
}): Promise<ReplyResult> {
  const { supabase, userId, timezone, locale, history, inboundText } = opts

  const ctx = await loadUserContext({ supabase, userId, timezone, locale })

  // Replace the WhatsApp-sourced recent messages with this conversation's
  // history so each saved thread keeps its own memory.
  ctx.recentMessages = history.slice(-HISTORY_WINDOW).map((m) => ({
    role: m.role,
    content: m.content,
  }))

  return generateReply(ctx, inboundText)
}

export type ReminderSlot = 'lunch' | 'dinner' | 'recap' | 'hydration'

/**
 * Generate a proactive reminder body for a slot, grounded in today's numbers.
 * Used by the coach-reminders cron to author in-app notifications.
 */
export async function generateCoachReminder(opts: {
  supabase: SupabaseClient
  userId: string
  timezone?: string
  locale?: 'pt' | 'en'
  slot: ReminderSlot
}): Promise<ReplyResult> {
  const { supabase, userId, timezone, locale, slot } = opts
  const ctx = await loadUserContext({ supabase, userId, timezone, locale })
  return generateNudge(ctx, slot)
}
