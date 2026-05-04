import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const MAX_MESSAGES = 200
const MAX_CONTENT_LEN = 4000

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )
}

async function findLinkedNutri(supabase: Awaited<ReturnType<typeof getSupabase>>, patientId: string) {
  const { data: link } = await supabase
    .from('nutri_patient_links')
    .select('nutri_id')
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!link?.nutri_id) return null

  const { data: nutri } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', link.nutri_id)
    .maybeSingle()
  return nutri ? { id: nutri.id, name: nutri.name as string | null } : { id: link.nutri_id, name: null }
}

export async function GET() {
  const supabase = await getSupabase()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nutri = await findLinkedNutri(supabase, user.id)
  if (!nutri) {
    return NextResponse.json({ nutri: null, messages: [] })
  }

  const { data: messages, error } = await supabase
    .from('nutri_chats')
    .select('id, role, content, created_at')
    .eq('patient_id', user.id)
    .eq('nutri_id', nutri.id)
    .order('created_at', { ascending: true })
    .limit(MAX_MESSAGES)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ nutri, messages: messages ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabase()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const rawContent = typeof body?.content === 'string' ? body.content.trim() : ''
  if (!rawContent) {
    return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 })
  }
  if (rawContent.length > MAX_CONTENT_LEN) {
    return NextResponse.json(
      { error: `A mensagem excede o limite de ${MAX_CONTENT_LEN} caracteres.` },
      { status: 400 },
    )
  }

  const nutri = await findLinkedNutri(supabase, user.id)
  if (!nutri) {
    return NextResponse.json(
      { error: 'Você ainda não tem um nutricionista vinculado.' },
      { status: 400 },
    )
  }

  const { data: inserted, error } = await supabase
    .from('nutri_chats')
    .insert({
      nutri_id: nutri.id,
      patient_id: user.id,
      role: 'user',
      content: rawContent,
    })
    .select('id, role, content, created_at')
    .single()

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? 'Falha ao enviar.' }, { status: 500 })
  }

  return NextResponse.json({ message: inserted })
}
