import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'

/**
 * Revoke a nutri↔patient link.
 *
 * Either party can call. The revoke_link(uuid) RPC (migration 031) does
 * authorization in-DB (raises 'forbidden' / 'link_not_found' on mismatch)
 * and writes the audit_log row in the same transaction as the status flip.
 *
 * Idempotent: a second call on an already-ended link returns the row.
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
    return NextResponse.json({ error: 'link_id inválido.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('revoke_link', { p_link_id: id })

  if (error) {
    // Translate the RPC's raised error codes into HTTP responses.
    if (error.message.includes('link_not_found')) {
      return NextResponse.json({ error: 'Vínculo não encontrado.' }, { status: 404 })
    }
    if (error.message.includes('forbidden')) {
      return NextResponse.json({ error: 'Sem permissão para encerrar este vínculo.' }, { status: 403 })
    }
    if (error.message.includes('unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, link: data })
}
