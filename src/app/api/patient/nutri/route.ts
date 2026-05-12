import { NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'

/**
 * Returns the patient's currently linked nutricionista (if any) along with
 * the link row so the UI can offer "Encerrar vínculo" via the revoke RPC.
 *
 * Today there's at most one active link per patient (the kanban + invite
 * flow maintain that invariant). If multiple ever existed, we return the
 * most recently created — which is the one the user most likely intended.
 *
 * Response shape:
 *   { link: { id, status, created_at } | null,
 *     nutri: { id, name, email } | null }
 */
export async function GET() {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const { data: link, error: linkErr } = await supabase
    .from('nutri_patient_links')
    .select('id, nutri_id, status, created_at')
    .eq('patient_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })
  if (!link) return NextResponse.json({ link: null, nutri: null })

  const { data: nutri } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('id', link.nutri_id)
    .maybeSingle()

  return NextResponse.json({
    link: { id: link.id, status: link.status, created_at: link.created_at },
    nutri: nutri ?? null,
  })
}
