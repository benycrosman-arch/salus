import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { extractTextFromAttachment, NUTRI_ATTACHMENT_MODEL } from '@/lib/nutri/parse-attachment'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 10 * 1024 * 1024
const MAX_PAGES = 30
const ALLOWED_KINDS = ['meal_plan', 'training', 'exam_guidance', 'other'] as const
type Kind = (typeof ALLOWED_KINDS)[number]

function countPdfPages(buf: Buffer): number {
  const text = buf.toString('latin1')
  const matches = text.match(/\/Type\s*\/Page(?![s])/g)
  return matches ? matches.length : 1
}

export async function POST(request: NextRequest) {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'nutricionista') {
    return NextResponse.json({ error: 'Apenas nutricionistas podem enviar anexos.' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Corpo multipart inválido.' }, { status: 400 })
  }

  const patientId = String(formData.get('patientId') ?? '').trim()
  const kindRaw = String(formData.get('kind') ?? 'other').trim()
  const kind: Kind = (ALLOWED_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as Kind)
    : 'other'
  const file = formData.get('file')

  if (!patientId) {
    return NextResponse.json({ error: 'patientId é obrigatório.' }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Apenas arquivos PDF são aceitos.' }, { status: 400 })
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `O PDF deve ter entre 1 byte e ${MAX_BYTES / 1024 / 1024} MB.` },
      { status: 400 },
    )
  }

  const { data: link } = await supabase
    .from('nutri_patient_links')
    .select('status')
    .eq('nutri_id', user.id)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .maybeSingle()
  if (!link) {
    return NextResponse.json({ error: 'Paciente não vinculado a você.' }, { status: 403 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const pageCount = countPdfPages(buffer)
  if (pageCount > MAX_PAGES) {
    return NextResponse.json(
      { error: `O PDF tem ${pageCount} páginas; o limite é ${MAX_PAGES}.` },
      { status: 400 },
    )
  }

  const { data: row, error: insertError } = await supabase
    .from('nutri_patient_attachments')
    .insert({
      nutri_id: user.id,
      patient_id: patientId,
      storage_path: '',
      original_filename: file.name?.slice(0, 255) || 'documento.pdf',
      byte_size: file.size,
      page_count: pageCount,
      kind,
      model: NUTRI_ATTACHMENT_MODEL,
    })
    .select('id')
    .single()
  if (insertError || !row) {
    console.error('[nutri/attachments] insert failed', insertError)
    return NextResponse.json({ error: 'Não foi possível registrar o anexo.' }, { status: 500 })
  }

  const storagePath = `${patientId}/${row.id}.pdf`
  const { error: storageError } = await supabase.storage
    .from('nutri-attachments')
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })
  if (storageError) {
    console.error('[nutri/attachments] storage upload failed', storageError)
    await supabase.from('nutri_patient_attachments').delete().eq('id', row.id)
    return NextResponse.json({ error: 'Falha ao salvar o PDF.' }, { status: 500 })
  }

  await supabase
    .from('nutri_patient_attachments')
    .update({ storage_path: storagePath })
    .eq('id', row.id)

  try {
    const pdfBase64 = buffer.toString('base64')
    const extraction = await extractTextFromAttachment(pdfBase64)
    await supabase
      .from('nutri_patient_attachments')
      .update({
        extracted_text: extraction.text,
        extracted_at: new Date().toISOString(),
      })
      .eq('id', row.id)
  } catch (err) {
    console.error('[nutri/attachments] extract failed', err)
  }

  return NextResponse.json({ ok: true, attachmentId: row.id })
}

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patientId')?.trim()
  if (!patientId) {
    return NextResponse.json({ error: 'patientId é obrigatório.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('nutri_patient_attachments')
    .select('id, storage_path, original_filename, byte_size, page_count, kind, extracted_at, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, attachments: data ?? [] })
}
