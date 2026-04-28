import { cookies, headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'

export const SUPPORTED_LOCALES = ['pt', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'pt'
export const LOCALE_COOKIE = 'NEXT_LOCALE'

// Pick a locale from the browser's Accept-Language header — first match wins.
// Used only when the user hasn't explicitly chosen via the switcher (no cookie yet).
function negotiateFromHeader(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null
  const tags = acceptLanguage
    .split(',')
    .map((part) => part.trim().split(';')[0].toLowerCase())
  for (const tag of tags) {
    const base = tag.split('-')[0]
    if ((SUPPORTED_LOCALES as readonly string[]).includes(base)) {
      return base as Locale
    }
  }
  return null
}

export default getRequestConfig(async () => {
  const store = await cookies()
  const cookieValue = store.get(LOCALE_COOKIE)?.value

  let locale: Locale
  if (cookieValue && (SUPPORTED_LOCALES as readonly string[]).includes(cookieValue)) {
    locale = cookieValue as Locale
  } else {
    const headerStore = await headers()
    locale = negotiateFromHeader(headerStore.get('accept-language')) ?? DEFAULT_LOCALE
  }

  const messages = (await import(`@/messages/${locale}.json`)).default

  return { locale, messages }
})
