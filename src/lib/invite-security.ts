import { countInvitesSince, hasPendingInviteFor } from './nutri-invites'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Verification gates for outbound nutri invites.
 *
 * The email channel is a known abuse surface (header injection, throwaway
 * domains, spam relays, enumeration). These checks run BEFORE the row is
 * inserted and the message is dispatched, and they fail loud — the nutri
 * sees a PT-BR error and nothing reaches Resend.
 */

export type InviteSecurityResult =
  | { ok: true; normalizedEmail: string }
  | { ok: false; status: number; error: string; code: string }

export const HOURLY_INVITE_CAP = 30
export const DAILY_INVITE_CAP = 100

const CONTROL_CHARS = /[\x00-\x1f\x7f]/
const STRICT_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const MAX_LOCAL_PART = 64
const MAX_TOTAL = 254

/**
 * Normalize and structurally validate the email. Stricter than the
 * permissive regex used at the API boundary — rejects header-injection
 * payloads (CR/LF), control chars, oversize local parts, and obviously
 * malformed shapes.
 */
export function validateAndNormalizeEmail(raw: unknown): { ok: true; email: string } | { ok: false; reason: string } {
  if (typeof raw !== 'string') return { ok: false, reason: 'E-mail é obrigatório.' }
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { ok: false, reason: 'E-mail é obrigatório.' }
  if (trimmed.length > MAX_TOTAL) return { ok: false, reason: 'E-mail muito longo.' }
  if (CONTROL_CHARS.test(trimmed)) return { ok: false, reason: 'E-mail contém caracteres inválidos.' }
  if (/[\r\n]/.test(trimmed)) return { ok: false, reason: 'E-mail contém quebras de linha.' }
  const lowered = trimmed.toLowerCase()
  if (!STRICT_EMAIL.test(lowered)) return { ok: false, reason: 'Formato de e-mail inválido.' }
  const [local, domain] = lowered.split('@')
  if (!local || !domain) return { ok: false, reason: 'Formato de e-mail inválido.' }
  if (local.length > MAX_LOCAL_PART) return { ok: false, reason: 'E-mail muito longo.' }
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return { ok: false, reason: 'Formato de e-mail inválido.' }
  }
  if (domain.includes('..') || domain.startsWith('-') || domain.endsWith('-')) {
    return { ok: false, reason: 'Formato de e-mail inválido.' }
  }
  return { ok: true, email: lowered }
}

/**
 * Full pre-send verification: format + per-nutri caps + duplicate guard.
 * Caller should treat anything other than `{ ok: true }` as a hard stop.
 */
export async function verifyInviteRequest(args: {
  supabase: SupabaseClient
  nutriId: string
  nutriOwnEmail: string | null
  rawEmail: unknown
}): Promise<InviteSecurityResult> {
  const v = validateAndNormalizeEmail(args.rawEmail)
  if (!v.ok) {
    return { ok: false, status: 400, error: v.reason, code: 'invalid_email' }
  }
  const email = v.email

  // Self-invite makes no sense and would create a circular link/row.
  if (args.nutriOwnEmail && email === args.nutriOwnEmail.trim().toLowerCase()) {
    return { ok: false, status: 400, error: 'Você não pode convidar o seu próprio e-mail.', code: 'self_invite' }
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [hourly, daily] = await Promise.all([
    countInvitesSince(args.supabase, args.nutriId, hourAgo),
    countInvitesSince(args.supabase, args.nutriId, dayAgo),
  ])

  if (hourly >= HOURLY_INVITE_CAP) {
    return {
      ok: false,
      status: 429,
      error: `Limite horário de convites atingido (${HOURLY_INVITE_CAP}/h). Tente novamente em alguns minutos.`,
      code: 'hourly_cap',
    }
  }
  if (daily >= DAILY_INVITE_CAP) {
    return {
      ok: false,
      status: 429,
      error: `Limite diário de convites atingido (${DAILY_INVITE_CAP}/dia). Tente novamente amanhã.`,
      code: 'daily_cap',
    }
  }

  const dup = await hasPendingInviteFor(args.supabase, args.nutriId, email)
  if (dup) {
    return {
      ok: false,
      status: 409,
      error: 'Já existe um convite pendente para este e-mail. Aguarde o paciente aceitar ou expire o anterior.',
      code: 'duplicate_pending',
    }
  }

  return { ok: true, normalizedEmail: email }
}
