/**
 * Minimal E.164 normalization. Good enough for Brazilian phone numbers, which
 * is the launch market. If we expand markets, swap in libphonenumber-js.
 */
export function normalizeE164(input: string, defaultCountry: 'BR' = 'BR'): string | null {
  const digits = input.replace(/\D/g, '')
  if (!digits) return null

  // Already includes country code.
  if (input.trim().startsWith('+')) {
    if (digits.length < 8 || digits.length > 15) return null
    return `+${digits}`
  }

  if (defaultCountry === 'BR') {
    // BR mobile is 11 digits with the leading 9: DDD (2) + 9 + 8.
    if (digits.length === 11) return `+55${digits}`
    if (digits.length === 13 && digits.startsWith('55')) return `+${digits}`
    return null
  }

  return null
}
