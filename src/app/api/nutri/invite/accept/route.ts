import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Consume an invite token + access code via the accept_invitation RPC
 * (migration 033). The RPC runs as security definer and reads auth.uid()
 * from the JWT, so we just need the user's authenticated supabase client
 * — no service-role bypass needed anymore.
 *
 * Inputs (in priority order):
 *   - body.token / body.code
 *   - `salus_invite` cookie (JSON `{token, code}` for new invites; legacy
 *     bare-token string for invites issued before migration 029)
 *
 * The RPC handles: token lookup with row lock, expiry, email match, code
 * verification + 5-attempt lock, link upsert, audit. Atomic single tx.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) =>
          s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | { token?: string; code?: string }
    | null

  const cookieRaw = cookieStore.get('salus_invite')?.value || ''
  const cookieParsed = parseInviteCookie(cookieRaw)

  const token = (body?.token || cookieParsed.token || '').trim()
  const rawCode = body?.code || cookieParsed.code || ''
  if (!token) {
    return NextResponse.json({ error: 'Token ausente.' }, { status: 400 })
  }

  type RpcResp =
    | { ok: true; nutri_id: string; already_accepted?: boolean }
    | {
        ok: false
        code:
          | 'not_found'
          | 'expired'
          | 'self_invite'
          | 'email_mismatch'
          | 'role_conflict'
          | 'code_locked'
          | 'code_required'
          | 'code_invalid'
        error: string
        invited_email?: string
        remaining?: number
      }

  const { data, error } = await supabase.rpc('accept_invitation', {
    p_token: token,
    p_code: rawCode || null,
  })

  if (error) {
    if (error.message.includes('unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('accept_invitation RPC failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const resp = data as RpcResp
  if (!resp.ok) {
    const status =
      resp.code === 'not_found'
        ? 404
        : resp.code === 'expired'
          ? 410
          : resp.code === 'email_mismatch' || resp.code === 'role_conflict'
            ? 403
            : resp.code === 'code_locked'
              ? 423
              : resp.code === 'code_invalid'
                ? 401
                : 400
    const payload: Record<string, unknown> = {
      error: resp.error,
      code: resp.code,
    }
    if ('invited_email' in resp && resp.invited_email) payload.invited_email = resp.invited_email
    if ('remaining' in resp && typeof resp.remaining === 'number') payload.remaining = resp.remaining
    return NextResponse.json(payload, { status })
  }

  // Burn the cookie so we don't try to re-accept on subsequent loads.
  cookieStore.set('salus_invite', '', { maxAge: 0, path: '/' })

  return NextResponse.json({ ok: true, nutri_id: resp.nutri_id })
}

function parseInviteCookie(raw: string): { token: string; code: string } {
  if (!raw) return { token: '', code: '' }
  if (raw.startsWith('{')) {
    try {
      const j = JSON.parse(raw) as { token?: unknown; code?: unknown }
      return {
        token: typeof j.token === 'string' ? j.token : '',
        code: typeof j.code === 'string' ? j.code : '',
      }
    } catch {
      return { token: '', code: '' }
    }
  }
  return { token: raw, code: '' }
}
