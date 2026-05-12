import { createHash, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Out-of-band access code for nutri invites.
 *
 * The code is shown to the nutri exactly once at creation time. Only the
 * salted SHA-256 hash is persisted, with the invite's UUID as the salt — so
 * even with full DB read access, the code can't be recovered without
 * brute-forcing 6 chars × 32-symbol alphabet (~1B combinations) PER INVITE.
 * The accept route caps attempts at MAX_CODE_ATTEMPTS, so the practical
 * brute-force surface is closed.
 *
 * Alphabet excludes I/O/0/1 to avoid handwriting/transcription errors when
 * the nutri reads the code aloud or sends it via WhatsApp.
 */

export const CODE_LENGTH = 6
export const MAX_CODE_ATTEMPTS = 5

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 32 chars, no I/O/0/1

/**
 * Generate a fresh 6-char access code using crypto.randomBytes for unbiased
 * sampling. Format: `ABC-DEF` for readability when shared verbally.
 */
export function generateAccessCode(): string {
  const bytes = randomBytes(CODE_LENGTH)
  let raw = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    // Modulo-32 of a uniform byte → unbiased because 256 is divisible by 32.
    raw += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return `${raw.slice(0, 3)}-${raw.slice(3)}`
}

/**
 * Normalize user-entered code: strip dashes/spaces, uppercase, only the
 * canonical alphabet. Returns null if the result isn't exactly CODE_LENGTH
 * valid chars.
 */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (cleaned.length !== CODE_LENGTH) return null
  for (const ch of cleaned) {
    if (!ALPHABET.includes(ch)) return null
  }
  return cleaned
}

/**
 * Hash a code with the invite ID as salt. Deterministic — same (id, code)
 * always produces the same hash, so we can compare server-side without
 * persisting the code itself.
 */
export function hashCode(inviteId: string, code: string): string {
  const cleaned = code.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  return createHash('sha256').update(`${inviteId}:${cleaned}`).digest('hex')
}

/**
 * Constant-time equality check. Both inputs are 64-char hex (sha256), so
 * length mismatch means tampering — return false without comparing.
 */
export function verifyCodeHash(expected: string, actual: string): boolean {
  if (expected.length !== actual.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'))
  } catch {
    return false
  }
}
