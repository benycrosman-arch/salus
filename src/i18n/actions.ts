'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { SUPPORTED_LOCALES, LOCALE_COOKIE, type Locale } from './request'

export async function setLocale(locale: Locale) {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return { ok: false as const, error: 'unsupported_locale' }
  }
  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })
  // Revalidate the whole tree so server components re-render with the new locale.
  revalidatePath('/', 'layout')
  return { ok: true as const }
}
