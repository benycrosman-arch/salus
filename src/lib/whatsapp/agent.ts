import Anthropic from '@anthropic-ai/sdk'
import {
  WHATSAPP_COACH_NUDGE_INSTRUCTIONS_EN,
  WHATSAPP_COACH_NUDGE_INSTRUCTIONS_PT,
  WHATSAPP_COACH_SYSTEM_PROMPT_EN,
  WHATSAPP_COACH_SYSTEM_PROMPT_PT,
} from '@/lib/prompts'
import { renderContextBlock } from './context'
import type { UserContext } from './types'

const COACH_MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS_REPLY = 350
const MAX_TOKENS_NUDGE = 200

type Anthropic_Block = { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }

let _client: Anthropic | null = null
function client(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  _client = new Anthropic({ apiKey })
  return _client
}

function systemBlocks(ctx: UserContext, mode: 'reply' | 'nudge'): Anthropic_Block[] {
  const isPt = ctx.locale !== 'en'
  const corePrompt = isPt ? WHATSAPP_COACH_SYSTEM_PROMPT_PT : WHATSAPP_COACH_SYSTEM_PROMPT_EN
  const modeInstructions =
    mode === 'nudge'
      ? isPt
        ? WHATSAPP_COACH_NUDGE_INSTRUCTIONS_PT
        : WHATSAPP_COACH_NUDGE_INSTRUCTIONS_EN
      : ''

  // Two-block system: stable prompt (cached aggressively) + per-day context
  // (cached for ~5min within rapid turns).
  return [
    {
      type: 'text',
      text: corePrompt + (modeInstructions ? `\n\n${modeInstructions}` : ''),
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: `${isPt ? 'DADOS DO USUÁRIO' : 'USER DATA'}\n${renderContextBlock(ctx)}`,
      cache_control: { type: 'ephemeral' },
    },
  ]
}

export interface ReplyResult {
  text: string
  usage?: { input: number; output: number; cache_read?: number; cache_creation?: number }
}

/**
 * Generate a reply for an inbound WhatsApp message. The system prompt + user
 * context are sent as cacheable blocks so back-to-back turns within the same
 * day pay only the input-cache rate.
 */
export async function generateReply(ctx: UserContext, inboundText: string): Promise<ReplyResult> {
  const messages: Anthropic.MessageParam[] = [
    ...ctx.recentMessages.map<Anthropic.MessageParam>((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: inboundText },
  ]

  const res = await client().messages.create({
    model: COACH_MODEL,
    max_tokens: MAX_TOKENS_REPLY,
    system: systemBlocks(ctx, 'reply') as unknown as Anthropic.TextBlockParam[],
    messages,
  })

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()

  return {
    text,
    usage: {
      input: res.usage.input_tokens,
      output: res.usage.output_tokens,
      cache_read: res.usage.cache_read_input_tokens ?? undefined,
      cache_creation: res.usage.cache_creation_input_tokens ?? undefined,
    },
  }
}

/**
 * Generate a proactive nudge. The "user message" is a synthetic prompt
 * describing the slot ("lunch", "dinner", "recap") — the agent fills in the
 * specifics from the cached context.
 */
export async function generateNudge(
  ctx: UserContext,
  slot: 'lunch' | 'dinner' | 'recap' | 'hydration',
): Promise<ReplyResult> {
  const isPt = ctx.locale !== 'en'

  const prompts: Record<typeof slot, string> = isPt
    ? {
        lunch: 'É a hora do almoço. Crie um lembrete focado em proteína e hidratação para esta refeição.',
        dinner:
          'É o início da janela do jantar. Crie um lembrete focado em fechar metas de fibra e proteína sem estourar calorias.',
        recap: 'Fim de dia. Faça um recap curto: score, proteína atingida, streak.',
        hydration: 'Janela de hidratação. Lembre da água com base em quanto falta.',
      }
    : {
        lunch: 'Lunch window. Write a reminder focused on protein and hydration for this meal.',
        dinner:
          'Dinner window. Write a reminder focused on closing fiber and protein gaps without overshooting calories.',
        recap: 'End of day. Short recap: score, protein hit, streak.',
        hydration: 'Hydration window. Remind about water based on what is left.',
      }

  const res = await client().messages.create({
    model: COACH_MODEL,
    max_tokens: MAX_TOKENS_NUDGE,
    system: systemBlocks(ctx, 'nudge') as unknown as Anthropic.TextBlockParam[],
    messages: [{ role: 'user', content: prompts[slot] }],
  })

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()

  return {
    text,
    usage: {
      input: res.usage.input_tokens,
      output: res.usage.output_tokens,
      cache_read: res.usage.cache_read_input_tokens ?? undefined,
      cache_creation: res.usage.cache_creation_input_tokens ?? undefined,
    },
  }
}
