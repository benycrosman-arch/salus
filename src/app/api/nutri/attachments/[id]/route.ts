import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: row, error: fetchError } = await supabase
    .from('nutri_patient_attachments')
    .select('id, storage_path, nutri_id')
    .eq('id', id)
    .maybeSingle()
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!row || row.nutri_id !== user.id) {
    return NextResponse.json({ error: 'Anexo não encontrado.' }, { status: 404 })
  }

  if (row.storage_path) {
    const { error: rmError } = await supabase.storage
      .from('nutri-attachments')
      .remove([row.storage_path])
    if (rmError) {
      console.error('[nutri/attachments DELETE] storage remove failed', rmError)
    }
  }

  const { error: delError } = await supabase
    .from('nutri_patient_attachments')
    .delete()
    .eq('id', id)
  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
