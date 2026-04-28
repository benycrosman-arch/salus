import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'

export async function POST(request: NextRequest) {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  const body = await request.json().catch(() => null) as { protocol?: string } | null
  const protocol = String(body?.protocol ?? '').trim().slice(0, 4000)
  if (protocol.length < 60) {
    return NextResponse.json({ error: 'Protocolo precisa ter pelo menos 60 caracteres.' }, { status: 400 })
  }

  // Confirm caller is a nutricionista
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'nutricionista') {
    return NextResponse.json({ error: 'Apenas nutricionistas podem editar o protocolo.' }, { status: 403 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ nutri_protocol: protocol, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
