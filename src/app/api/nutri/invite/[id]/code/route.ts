import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'

/**
 * Retrieve the raw access code for an invite within the 5-minute window
 * after creation. Nutri-only (authorization in the RPC: caller must be
 * the inviting nutricionista). After 5 min OR after the patient accepts,
 * the code is wiped server-side and this returns 410 Gone.
 *
 * Used by the credentials card on the nutri panel for two reasons:
 *   - the create response already returns the code, but if the nutri
 *     refreshes the tab they need a way to recover it
 *   - the card polls the expires_at timestamp to drive the countdown
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { supabase } = guard

  const { id } = await context.params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'invite_id inválido.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('get_invite_code', { p_invite_id: id })

  if (error) {
    if (error.message.includes('forbidden')) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }
    if (error.message.includes('unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('get_invite_code RPC failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type RpcResp =
    | { ok: true; access_code: string; expires_at: string }
    | { ok: false; code: 'not_found' | 'not_pending' | 'code_expired' }

  const resp = data as RpcResp
  if (!resp.ok) {
    const status =
      resp.code === 'not_found'
        ? 404
        : resp.code === 'code_expired'
          ? 410
          : 409
    return NextResponse.json({ error: resp.code, code: resp.code }, { status })
  }

  return NextResponse.json({
    ok: true,
    accessCode: resp.access_code,
    expiresAt: resp.expires_at,
  })
}
