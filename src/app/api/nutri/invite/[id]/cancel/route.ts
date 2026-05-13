import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'

/**
 * Cancel a pending invite. Wraps the cancel_invitation RPC (migration 036).
 *
 * The RPC handles auth (must be the inviting nutri), idempotency
 * (already-cancelled returns ok), and the audit write. Row stays in the
 * table for history but status flips to 'expired' and the plaintext code
 * is wiped immediately.
 */
export async function POST(
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

  const { data, error } = await supabase.rpc('cancel_invitation', { p_invite_id: id })

  if (error) {
    if (error.message.includes('forbidden')) {
      return NextResponse.json({ error: 'Sem permissão para cancelar este convite.' }, { status: 403 })
    }
    if (error.message.includes('unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('cancel_invitation RPC failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type RpcResp =
    | { ok: true; status: string; already_settled?: boolean }
    | { ok: false; code: 'not_found'; error: string }

  const resp = data as RpcResp
  if (!resp.ok) {
    return NextResponse.json({ error: resp.error }, { status: 404 })
  }

  return NextResponse.json({ ok: true, status: resp.status })
}
