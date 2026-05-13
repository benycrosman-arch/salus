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

async function authedNutri(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  patientId: string,
) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: link } = await supabase
    .from('nutri_patient_links')
    .select('id')
    .eq('nutri_id', user.id)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .maybeSingle()
  if (!link) {
    return { error: NextResponse.json({ error: 'Paciente não vinculado.' }, { status: 403 }) }
  }
  return { nutriId: user.id }
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: patientId } = await ctx.params
  const supabase = await getSupabase()
  const guard = await authedNutri(supabase, patientId)
  if ('error' in guard) return guard.error

  const { data: messages, error } = await supabase
    .from('nutri_chats')
    .select('id, role, content, created_at')
    .eq('nutri_id', guard.nutriId)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true })
    .limit(MAX_MESSAGES)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: messages ?? [] })
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: patientId } = await ctx.params
  const supabase = await getSupabase()
  const guard = await authedNutri(supabase, patientId)
  if ('error' in guard) return guard.error

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

  const { data: inserted, error } = await supabase
    .from('nutri_chats')
    .insert({
      nutri_id: guard.nutriId,
      patient_id: patientId,
      role: 'assistant',
      content: rawContent,
    })
    .select('id, role, content, created_at')
    .single()

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? 'Falha ao enviar.' }, { status: 500 })
  }
  return NextResponse.json({ message: inserted })
}
