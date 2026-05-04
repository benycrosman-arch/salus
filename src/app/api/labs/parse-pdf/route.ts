import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { extractLabsFromPdf, LAB_PDF_MODEL } from '@/lib/labs/parse-pdf'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_PAGES = 20

function countPdfPages(buf: Buffer): number {
  // Cheap, no-dep page counter — looks for "/Type /Page" object headers.
  // Good enough for the cap check; not authoritative.
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
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })
  }

  const file = formData.get('file')
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

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const pageCount = countPdfPages(buffer)
  if (pageCount > MAX_PAGES) {
    return NextResponse.json(
      { error: `O PDF tem ${pageCount} páginas; o limite é ${MAX_PAGES}.` },
      { status: 400 },
    )
  }

  // 1) Reserve the upload row so we have an ID for the storage path.
  const { data: uploadRow, error: insertError } = await supabase
    .from('lab_uploads')
    .insert({
      user_id: user.id,
      storage_path: '', // filled after upload
      original_filename: file.name?.slice(0, 255) || 'exame.pdf',
      byte_size: file.size,
      page_count: pageCount,
      model: LAB_PDF_MODEL,
    })
    .select('id')
    .single()

  if (insertError || !uploadRow) {
    console.error('[labs/parse-pdf] lab_uploads insert failed', insertError)
    return NextResponse.json({ error: 'Não foi possível registrar o upload.' }, { status: 500 })
  }

  const storagePath = `${user.id}/${uploadRow.id}.pdf`

  // 2) Persist the PDF in private storage.
  const { error: storageError } = await supabase.storage
    .from('lab-pdfs')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (storageError) {
    console.error('[labs/parse-pdf] storage upload failed', storageError)
    await supabase.from('lab_uploads').delete().eq('id', uploadRow.id)
    return NextResponse.json({ error: 'Falha ao salvar o PDF.' }, { status: 500 })
  }

  await supabase
    .from('lab_uploads')
    .update({ storage_path: storagePath })
    .eq('id', uploadRow.id)

  // 3) Ask Claude Opus 4.7 to extract markers.
  const pdfBase64 = buffer.toString('base64')
  let extraction
  try {
    extraction = await extractLabsFromPdf(pdfBase64)
  } catch (err) {
    console.error('[labs/parse-pdf] anthropic extract failed', err)
    return NextResponse.json(
      { error: 'extraction_failed', uploadId: uploadRow.id },
      { status: 502 },
    )
  }

  const markersExtracted =
    Object.values(extraction.extraction.known).filter((v) => v !== null).length +
    extraction.extraction.extras.length

  await supabase
    .from('lab_uploads')
    .update({
      parsed_at: new Date().toISOString(),
      markers_extracted: markersExtracted,
      raw_extraction: extraction.raw as object,
    })
    .eq('id', uploadRow.id)

  return NextResponse.json({
    uploadId: uploadRow.id,
    measuredAt: extraction.extraction.measured_at,
    knownLabs: extraction.extraction.known,
    extraLabs: extraction.extraction.extras,
    confidence: extraction.extraction.confidence,
    notes: extraction.extraction.notes,
    usage: extraction.usage,
  })
}
