import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  if (!url.startsWith('http')) {
    throw new Error('Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL nas variáveis de ambiente.')
  }

  return createBrowserClient(url, key)
}
