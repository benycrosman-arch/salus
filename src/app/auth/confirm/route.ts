// Alias for /auth/callback. Newer Supabase email templates default to /auth/confirm.
// We forward all query params so both paths work the same way.
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const target = new URL('/auth/callback', url.origin)
  url.searchParams.forEach((value, key) => target.searchParams.set(key, value))
  return NextResponse.redirect(target)
}
