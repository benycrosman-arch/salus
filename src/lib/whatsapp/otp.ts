import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

const PEPPER = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'salus-otp-pepper-fallback'

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashCode(code: string): string {
  return createHash('sha256').update(`${PEPPER}:${code}`).digest('hex')
}

export function verifyCode(plaintext: string, hash: string | null): boolean {
  if (!hash) return false
  const expected = Buffer.from(hashCode(plaintext), 'hex')
  const provided = Buffer.from(hash, 'hex')
  if (expected.length !== provided.length) return false
  return timingSafeEqual(expected, provided)
}
