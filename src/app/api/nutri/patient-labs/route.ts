// Nutricionista uploads a blood-exam PDF or photos for a linked paciente.
// Mirrors the patient-facing /api/labs/parse-pdf flow but:
//   - validates the active nutri↔paciente link
//   - writes lab_uploads/lab_results rows under the patient's user_id using
//     the service-role client (RLS blocks cross-user inserts otherwise)
//   - auto-saves every extracted marker since the nutri is the source of truth
//     for this upload — they can edit individual rows later

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'
import {
  extractLabsFromPdf,
  extractLabsFromImages,
  LAB_PDF_MODEL,
  type ImageMediaType,
  type PdfExtractionResult,
} from '@/lib/labs/parse-pdf'
import { interpretLabs, type RawMarker } from '@/lib/labs/interpret'
import type { Sex } from '@/lib/labs/reference-ranges'

export const runtime = 'nodejs'
export const maxDuration = 90

const MAX_PDF_BYTES = 10 * 1024 * 1024
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_TOTAL_BYTES = 24 * 1024 * 1024
const MAX_IMAGES = 8
const MAX_PAGES = 35

const ALLOWED_IMAGE_TYPES = new Set<ImageMediaType>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

function countPdfPages(buf: Buffer): number {
  const text = buf.toString('latin1')
  const matches = text.match(/\/Type\s*\/Page(?![s])/g)
  return matches ? matches.length : 1
}

function profileSex(raw: string | null | undefined): Sex {
  if (raw === 'male') return 'M'
  if (raw === 'female') return 'F'
  return 'any'
}

function isImageType(t: string): t is ImageMediaType {
  return ALLOWED_IMAGE_TYPES.has(t as ImageMediaType)
}

function extensionFor(mediaType: string): string {
  switch (mediaType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    default:
      return 'bin'
  }
}

const KNOWN_LABELS: Record<string, string> = {
  glucose: 'Glicose em jejum',
  hba1c: 'Hemoglobina glicada (HbA1c)',
  hdl: 'HDL',
  ldl: 'LDL',
  triglycerides: 'Triglicérides',
  vitaminD: 'Vitamina D (25-OH)',
  ferritin: 'Ferritina',
  b12: 'Vitamina B12',
}
const KNOWN_UNITS: Record<string, string> = {
  glucose: 'mg/dL',
  hba1c: '%',
  hdl: 'mg/dL',
  ldl: 'mg/dL',
  triglycerides: 'mg/dL',
  vitaminD: 'ng/mL',
  ferritin: 'ng/mL',
  b12: 'pg/mL',
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
    return NextResponse.json(
      { error: 'Apenas nutricionistas podem enviar exames de pacientes.' },
      { status: 403 },
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Corpo multipart inválido.' }, { status: 400 })
  }

  const patientId = String(formData.get('patientId') ?? '').trim()
  if (!patientId) {
    return NextResponse.json({ error: 'patientId é obrigatório.' }, { status: 400 })
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

  const rawEntries: File[] = []
  const single = formData.get('file')
  if (single instanceof File) rawEntries.push(single)
  for (const entry of formData.getAll('files')) {
    if (entry instanceof File) rawEntries.push(entry)
  }
  if (rawEntries.length === 0) {
    return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 })
  }

  const pdfFiles = rawEntries.filter((f) => f.type === 'application/pdf')
  const imageFiles = rawEntries.filter((f) => isImageType(f.type))
  const unknownFiles = rawEntries.filter(
    (f) => f.type !== 'application/pdf' && !isImageType(f.type),
  )

  if (unknownFiles.length > 0) {
    return NextResponse.json(
      { error: 'Aceitamos PDF ou fotos JPEG/PNG/WebP.' },
      { status: 400 },
    )
  }
  if (pdfFiles.length > 0 && imageFiles.length > 0) {
    return NextResponse.json(
      { error: 'Envie PDF OU fotos — não os dois juntos.' },
      { status: 400 },
    )
  }
  if (pdfFiles.length > 1) {
    return NextResponse.json({ error: 'Um PDF por vez.' }, { status: 400 })
  }
  if (imageFiles.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `Máximo de ${MAX_IMAGES} fotos por envio.` },
      { status: 400 },
    )
  }

  let totalBytes = 0
  for (const f of rawEntries) {
    if (f.size === 0) {
      return NextResponse.json({ error: 'Arquivo vazio.' }, { status: 400 })
    }
    totalBytes += f.size
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { error: `Tamanho total acima do limite (${MAX_TOTAL_BYTES / 1024 / 1024} MB).` },
      { status: 400 },
    )
  }
  if (pdfFiles[0] && pdfFiles[0].size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: `PDF acima do limite (${MAX_PDF_BYTES / 1024 / 1024} MB).` },
      { status: 400 },
    )
  }
  for (const img of imageFiles) {
    if (img.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `Foto acima do limite (${MAX_IMAGE_BYTES / 1024 / 1024} MB).` },
        { status: 400 },
      )
    }
  }

  const isPdfMode = pdfFiles.length === 1
  const pdfBuffer = isPdfMode ? Buffer.from(await pdfFiles[0].arrayBuffer()) : null
  const pageCount = pdfBuffer ? countPdfPages(pdfBuffer) : imageFiles.length
  if (pdfBuffer && pageCount > MAX_PAGES) {
    return NextResponse.json(
      { error: `O PDF tem ${pageCount} páginas; o limite é ${MAX_PAGES}.` },
      { status: 400 },
    )
  }

  const imagePayloads = isPdfMode
    ? []
    : await Promise.all(
        imageFiles.map(async (f) => ({
          buffer: Buffer.from(await f.arrayBuffer()),
          mediaType: f.type as ImageMediaType,
          name: f.name,
        })),
      )

  const service = createServiceClient()

  const { data: patientProfile } = await service
    .from('profiles')
    .select('biological_sex, age')
    .eq('id', patientId)
    .maybeSingle()
  const sex = profileSex(patientProfile?.biological_sex)
  const age = typeof patientProfile?.age === 'number' ? patientProfile.age : 30

  const primaryName = isPdfMode
    ? pdfFiles[0].name?.slice(0, 255) || 'exame.pdf'
    : imageFiles[0]?.name?.slice(0, 255) || `exame-${imageFiles.length}-fotos`
  const primaryExt = isPdfMode ? 'pdf' : extensionFor(imageFiles[0]?.type || 'image/jpeg')

  const { data: uploadRow, error: insertError } = await service
    .from('lab_uploads')
    .insert({
      user_id: patientId,
      storage_path: '',
      original_filename: primaryName,
      byte_size: totalBytes,
      page_count: pageCount,
      model: LAB_PDF_MODEL,
    })
    .select('id')
    .single()

  if (insertError || !uploadRow) {
    console.error('[nutri/patient-labs] lab_uploads insert failed', insertError)
    return NextResponse.json({ error: 'Não foi possível registrar o upload.' }, { status: 500 })
  }

  const storagePathPrimary = isPdfMode
    ? `${patientId}/${uploadRow.id}.pdf`
    : `${patientId}/${uploadRow.id}-1.${primaryExt}`

  if (isPdfMode && pdfBuffer) {
    const { error: storageError } = await service.storage
      .from('lab-pdfs')
      .upload(storagePathPrimary, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })
    if (storageError) {
      console.error('[nutri/patient-labs] storage upload failed', storageError)
      await service.from('lab_uploads').delete().eq('id', uploadRow.id)
      return NextResponse.json({ error: 'Falha ao salvar o PDF.' }, { status: 500 })
    }
  } else {
    let firstError: { message: string } | null = null
    for (let i = 0; i < imagePayloads.length; i++) {
      const img = imagePayloads[i]
      const ext = extensionFor(img.mediaType)
      const path = `${patientId}/${uploadRow.id}-${i + 1}.${ext}`
      const { error } = await service.storage
        .from('lab-pdfs')
        .upload(path, img.buffer, { contentType: img.mediaType, upsert: false })
      if (error) {
        firstError = error
        break
      }
    }
    if (firstError) {
      console.error('[nutri/patient-labs] image upload failed', firstError)
      await service.from('lab_uploads').delete().eq('id', uploadRow.id)
      return NextResponse.json({ error: 'Falha ao salvar as fotos.' }, { status: 500 })
    }
  }

  await service
    .from('lab_uploads')
    .update({ storage_path: storagePathPrimary })
    .eq('id', uploadRow.id)

  let extraction: PdfExtractionResult
  try {
    if (isPdfMode && pdfBuffer) {
      extraction = await extractLabsFromPdf(pdfBuffer.toString('base64'))
    } else {
      extraction = await extractLabsFromImages(
        imagePayloads.map((img) => ({
          mediaType: img.mediaType,
          base64: img.buffer.toString('base64'),
        })),
      )
    }
  } catch (err) {
    console.error('[nutri/patient-labs] anthropic extract failed', err)
    return NextResponse.json(
      { error: 'extraction_failed', uploadId: uploadRow.id },
      { status: 502 },
    )
  }

  const rawMarkers: RawMarker[] = []
  for (const [key, value] of Object.entries(extraction.extraction.known)) {
    if (value === null) continue
    rawMarkers.push({
      marker: KNOWN_LABELS[key] ?? key,
      value,
      unit: KNOWN_UNITS[key] ?? '',
    })
  }
  for (const x of extraction.extraction.extras) {
    rawMarkers.push({
      marker: x.marker,
      value: x.value,
      unit: x.unit,
      reference_min: x.reference_min,
      reference_max: x.reference_max,
    })
  }

  const interpreted = interpretLabs(rawMarkers, sex, age)

  // Auto-save all extracted markers under the patient — nutri uploaded the
  // laudo so we trust the values. They can edit individual rows later.
  const today = new Date().toISOString().slice(0, 10)
  const measuredAt =
    extraction.extraction.measured_at &&
    /^\d{4}-\d{2}-\d{2}$/.test(extraction.extraction.measured_at)
      ? extraction.extraction.measured_at
      : today

  const rows: Array<Record<string, unknown>> = []
  for (const [key, value] of Object.entries(extraction.extraction.known)) {
    if (value === null) continue
    rows.push({
      user_id: patientId,
      marker: KNOWN_LABELS[key] ?? key,
      value,
      unit: KNOWN_UNITS[key] ?? '',
      measured_at: measuredAt,
      source: 'pdf_upload',
      upload_id: uploadRow.id,
    })
  }
  for (const x of extraction.extraction.extras) {
    rows.push({
      user_id: patientId,
      marker: x.marker,
      value: x.value,
      unit: x.unit,
      reference_min: x.reference_min,
      reference_max: x.reference_max,
      measured_at: measuredAt,
      source: 'pdf_upload',
      upload_id: uploadRow.id,
    })
  }

  let savedCount = 0
  if (rows.length > 0) {
    const { error: rowsError } = await service.from('lab_results').insert(rows)
    if (rowsError) {
      console.error('[nutri/patient-labs] lab_results insert failed', rowsError)
    } else {
      savedCount = rows.length
    }
  }

  const knownExtractedCount = Object.values(extraction.extraction.known).filter(
    (v) => v !== null,
  ).length
  const markersExtracted = knownExtractedCount + extraction.extraction.extras.length

  await service
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
    interpretation: {
      markers: interpreted.markers,
      flags: interpreted.flags,
      rollup: interpreted.rollup,
    },
    savedCount,
    usage: extraction.usage,
    attempts: extraction.attempts,
  })
}
