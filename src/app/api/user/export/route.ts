import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
// Use the standalone bundle so AFM font data is inlined — required for Next.js/Vercel
// (the default `pdfkit` entry reads .afm files from disk via fs, which Webpack does not bundle).
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Export user data as a doctor-friendly PDF in Portuguese.
 * Designed so a patient can download and share with a physician/nutritionist.
 * LGPD/GDPR/Apple privacy guidelines compliant — covers all data we hold on the caller.
 */

const MEAL_TYPE_PT: Record<string, string> = {
  breakfast: 'Café da manhã',
  snack1: 'Lanche da manhã',
  lunch: 'Almoço',
  snack2: 'Lanche da tarde',
  dinner: 'Jantar',
  other: 'Refeição',
}

const SEX_PT: Record<string, string> = {
  male: 'Masculino',
  female: 'Feminino',
  other: 'Outro',
}

const DIET_PT: Record<string, string> = {
  omnivore: 'Onívoro',
  vegetarian: 'Vegetariano',
  vegan: 'Vegano',
  pescatarian: 'Pescetariano',
  keto: 'Cetogênica',
  lowcarb: 'Low-carb',
  mediterranean: 'Mediterrânea',
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '—'
  }
}

function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function ageFromBirthDate(birth: string | null | undefined): number | null {
  if (!birth) return null
  const b = new Date(birth)
  if (Number.isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

function bmi(weightKg: number | null, heightCm: number | null): { value: number; classification: string } | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null
  const m = heightCm / 100
  const v = weightKg / (m * m)
  let cls = 'normal'
  if (v < 18.5) cls = 'abaixo do peso'
  else if (v < 25) cls = 'peso normal'
  else if (v < 30) cls = 'sobrepeso'
  else if (v < 35) cls = 'obesidade grau I'
  else if (v < 40) cls = 'obesidade grau II'
  else cls = 'obesidade grau III'
  return { value: Math.round(v * 10) / 10, classification: cls }
}

function labStatus(value: number, min: number | null, max: number | null): string {
  if (min != null && value < min) return 'abaixo da referência'
  if (max != null && value > max) return 'acima da referência'
  if (min != null || max != null) return 'dentro da referência'
  return '—'
}

interface FoodItem { name?: string; quantity?: string; quantity_g?: number }
interface MacroBlock { calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number }
interface MealRow {
  logged_at: string
  meal_type: string | null
  foods_detected: FoodItem[] | null
  macros: MacroBlock | null
  score: number | null
  user_notes: string | null
}
interface LabRow {
  marker: string
  value: number
  unit: string
  reference_min: number | null
  reference_max: number | null
  measured_at: string
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fetchTable = async <T = unknown>(table: string, fk: string): Promise<T[]> => {
    const { data } = await supabase.from(table).select('*').eq(fk, user.id)
    return (data ?? []) as T[]
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [profile, preferences, meals, streaks, labResults] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(r => r.data as Record<string, unknown> | null),
    supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle().then(r => r.data as Record<string, unknown> | null),
    supabase.from('meals')
      .select('logged_at,meal_type,foods_detected,macros,score,user_notes')
      .eq('user_id', user.id)
      .gte('logged_at', thirtyDaysAgo)
      .order('logged_at', { ascending: false })
      .then(r => (r.data ?? []) as MealRow[]),
    fetchTable<{ current_streak?: number; longest_streak?: number; last_logged_date?: string }>('streaks', 'user_id'),
    supabase.from('lab_results')
      .select('marker,value,unit,reference_min,reference_max,measured_at')
      .eq('user_id', user.id)
      .order('measured_at', { ascending: false })
      .then(r => (r.data ?? []) as LabRow[]),
  ])

  const buffers: Buffer[] = []
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
  doc.on('data', (chunk: Buffer) => buffers.push(chunk))

  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)))
  })

  const PAGE_WIDTH = doc.page.width - doc.page.margins.left - doc.page.margins.right
  const LEFT = doc.page.margins.left

  const ensureSpace = (lines: number) => {
    if (doc.y + lines * 14 > doc.page.height - doc.page.margins.bottom) doc.addPage()
  }

  const h1 = (text: string) => {
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#1a3a2a').text(text, { align: 'center' })
    doc.moveDown(0.3)
  }
  const h2 = (text: string) => {
    ensureSpace(3)
    doc.moveDown(0.6)
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#1a3a2a').text(text)
    doc.moveTo(LEFT, doc.y + 2).lineTo(LEFT + PAGE_WIDTH, doc.y + 2).strokeColor('#1a3a2a').lineWidth(0.8).stroke()
    doc.moveDown(0.4)
    doc.fillColor('#222')
  }
  const kv = (label: string, value: string) => {
    ensureSpace(1)
    const labelWidth = 140
    const y = doc.y
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#555').text(label, LEFT, y, { width: labelWidth, continued: false })
    doc.font('Helvetica').fontSize(10).fillColor('#111').text(value, LEFT + labelWidth, y, { width: PAGE_WIDTH - labelWidth })
  }
  const muted = (text: string) => {
    ensureSpace(1)
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#777').text(text)
    doc.fillColor('#111')
  }

  // ─── Header ───
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a3a2a').text('SALUS', { align: 'left' })
  doc.font('Helvetica').fontSize(9).fillColor('#777').text('Relatório nutricional do paciente', { align: 'left' })
  doc.moveDown(1)

  h1('Relatório Nutricional')
  doc.font('Helvetica').fontSize(10).fillColor('#555').text(
    `Gerado em ${fmtDateTime(new Date())}`,
    { align: 'center' },
  )
  doc.moveDown(0.5)

  // ─── Patient ───
  h2('Identificação do paciente')
  const name = (profile?.name as string) || '—'
  const email = user.email || '—'
  const birth = (profile?.birth_date as string) || null
  const age = ageFromBirthDate(birth)
  const sex = SEX_PT[(profile?.biological_sex as string) || ''] || '—'
  const height = (profile?.height_cm as number) || null
  const weight = (profile?.weight_kg as number) || null
  const imc = bmi(weight, height)

  kv('Nome:', name)
  kv('E-mail:', email)
  kv('Data de nascimento:', `${fmtDate(birth)}${age != null ? ` (${age} anos)` : ''}`)
  kv('Sexo biológico:', sex)
  kv('Altura:', height ? `${height} cm` : '—')
  kv('Peso:', weight ? `${weight.toFixed(1).replace('.', ',')} kg` : '—')
  kv('IMC:', imc ? `${imc.value.toString().replace('.', ',')} kg/m² (${imc.classification})` : '—')
  kv('Cidade:', (profile?.city as string) || '—')

  // ─── Goals & dietary profile ───
  h2('Objetivos e perfil alimentar')
  const goals = (preferences?.goals as string[]) || []
  const dietType = (preferences?.diet_type as string) || ''
  const allergies = (preferences?.allergies as string[]) || []
  const restrictions = (preferences?.preferences as string[]) || []
  const gutScore = preferences?.gut_score as number | null

  kv('Objetivos:', goals.length ? goals.join(', ') : 'não informado')
  kv('Tipo de dieta:', DIET_PT[dietType] || dietType || 'não informado')
  kv('Alergias:', allergies.length ? allergies.join(', ') : 'nenhuma informada')
  kv('Restrições/preferências:', restrictions.length ? restrictions.join(', ') : 'nenhuma informada')
  kv('Score intestinal (auto-relato):', gutScore != null ? `${gutScore}/100` : '—')

  // ─── Lab results ───
  h2('Exames laboratoriais')
  if (labResults.length === 0) {
    muted('Nenhum exame registrado pelo paciente neste app.')
  } else {
    // Most recent value per marker (already ordered desc by measured_at)
    const seen = new Set<string>()
    const latest: LabRow[] = []
    for (const r of labResults) {
      if (seen.has(r.marker)) continue
      seen.add(r.marker)
      latest.push(r)
    }
    for (const r of latest) {
      ensureSpace(2)
      const range = (r.reference_min != null || r.reference_max != null)
        ? ` (ref. ${r.reference_min ?? '—'}${r.reference_max != null ? '–' + r.reference_max : ''} ${r.unit})`
        : ''
      const status = labStatus(r.value, r.reference_min, r.reference_max)
      const valueStr = `${r.value} ${r.unit}`
      const line = `• ${r.marker}: ${valueStr}${range} — ${status}  [coleta: ${fmtDate(r.measured_at)}]`
      doc.font('Helvetica').fontSize(10).fillColor('#111').text(line)
    }
    if (labResults.length > latest.length) {
      doc.moveDown(0.3)
      muted(`Foram registrados ${labResults.length} resultados ao todo (mostrando o mais recente por marcador). Histórico completo no final deste documento.`)
    }
  }

  // ─── Activity summary (last 30 days) ───
  h2('Resumo nutricional — últimos 30 dias')

  const totalMeals = meals.length
  const scored = meals.filter(m => typeof m.score === 'number') as Array<MealRow & { score: number }>
  const avgScore = scored.length ? Math.round(scored.reduce((s, m) => s + m.score, 0) / scored.length) : null

  // Group by date for daily averages
  const byDay = new Map<string, MealRow[]>()
  for (const m of meals) {
    const d = m.logged_at.slice(0, 10)
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d)!.push(m)
  }
  const dailyTotals = Array.from(byDay.values()).map(dayMeals => {
    const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    for (const m of dayMeals) {
      const mc = m.macros || {}
      t.kcal += Number(mc.calories ?? 0)
      t.protein += Number(mc.protein ?? 0)
      t.carbs += Number(mc.carbs ?? 0)
      t.fat += Number(mc.fat ?? 0)
      t.fiber += Number(mc.fiber ?? 0)
    }
    return t
  })
  const days = dailyTotals.length || 1
  const avgKcal = Math.round(dailyTotals.reduce((s, d) => s + d.kcal, 0) / days)
  const avgProtein = Math.round(dailyTotals.reduce((s, d) => s + d.protein, 0) / days)
  const avgCarbs = Math.round(dailyTotals.reduce((s, d) => s + d.carbs, 0) / days)
  const avgFat = Math.round(dailyTotals.reduce((s, d) => s + d.fat, 0) / days)
  const avgFiber = Math.round(dailyTotals.reduce((s, d) => s + d.fiber, 0) / days)
  const streak = streaks[0] || {}

  kv('Total de refeições registradas:', String(totalMeals))
  kv('Dias com registro:', String(byDay.size))
  kv('Pontuação média (0–100):', avgScore != null ? String(avgScore) : '—')
  kv('Sequência atual:', `${streak.current_streak ?? 0} dia(s)`)
  kv('Maior sequência:', `${streak.longest_streak ?? 0} dia(s)`)

  doc.moveDown(0.4)
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a3a2a').text('Médias diárias estimadas (por dia com registro):')
  doc.fillColor('#111')
  kv('Calorias:', totalMeals ? `${avgKcal} kcal` : '—')
  kv('Proteínas:', totalMeals ? `${avgProtein} g` : '—')
  kv('Carboidratos:', totalMeals ? `${avgCarbs} g` : '—')
  kv('Gorduras:', totalMeals ? `${avgFat} g` : '—')
  kv('Fibras:', totalMeals ? `${avgFiber} g` : '—')

  muted('Estes valores são estimativas geradas a partir de fotos das refeições por inteligência artificial. Devem ser interpretados como tendência, não como medição precisa.')

  // ─── Meal log ───
  h2('Registro de refeições — últimos 30 dias')
  if (meals.length === 0) {
    muted('Nenhuma refeição registrada nos últimos 30 dias.')
  } else {
    for (const m of meals) {
      ensureSpace(4)
      const when = fmtDateTime(m.logged_at)
      const type = MEAL_TYPE_PT[m.meal_type || 'other'] || 'Refeição'
      const score = typeof m.score === 'number' ? `${m.score}/100` : '—'
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111').text(`${when} — ${type} — Pontuação: ${score}`)
      const foods = (m.foods_detected || [])
        .map(f => {
          const q = f.quantity || (f.quantity_g ? `${Math.round(f.quantity_g)}g` : '')
          return q ? `${f.name} (${q})` : f.name
        })
        .filter(Boolean)
      if (foods.length) {
        doc.font('Helvetica').fontSize(9).fillColor('#444').text(`Alimentos: ${foods.join(', ')}`)
      }
      const mc = m.macros || {}
      const macroLine = `Calorias: ${Math.round(mc.calories ?? 0)} kcal · Prot: ${Math.round(mc.protein ?? 0)}g · Carb: ${Math.round(mc.carbs ?? 0)}g · Gord: ${Math.round(mc.fat ?? 0)}g · Fibra: ${Math.round(mc.fiber ?? 0)}g`
      doc.font('Helvetica').fontSize(9).fillColor('#444').text(macroLine)
      if (m.user_notes) {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#666').text(`Observações: ${m.user_notes}`)
      }
      doc.moveDown(0.35)
    }
  }

  // ─── Full lab history (if more than latest-per-marker) ───
  if (labResults.length > new Set(labResults.map(r => r.marker)).size) {
    h2('Histórico completo de exames')
    for (const r of labResults) {
      ensureSpace(1)
      const range = (r.reference_min != null || r.reference_max != null)
        ? ` (ref. ${r.reference_min ?? '—'}${r.reference_max != null ? '–' + r.reference_max : ''} ${r.unit})`
        : ''
      doc.font('Helvetica').fontSize(9).fillColor('#222').text(
        `${fmtDate(r.measured_at)} — ${r.marker}: ${r.value} ${r.unit}${range}`,
      )
    }
  }

  // ─── Footer / disclaimer + page numbers ───
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    const bottom = doc.page.height - doc.page.margins.bottom + 15
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#888').text(
      'Este documento é gerado pelo Salus, app de educação nutricional. As estimativas baseiam-se em análise de imagens por IA e auto-relato do paciente — não substituem avaliação clínica nem laboratorial profissional.',
      LEFT, bottom - 12, { width: PAGE_WIDTH, align: 'center' },
    )
    doc.fillColor('#888').fontSize(8).text(
      `Página ${i - range.start + 1} de ${range.count}`,
      LEFT, bottom + 10, { width: PAGE_WIDTH, align: 'center' },
    )
  }

  doc.end()
  const pdfBuffer = await done

  const safeName = ((profile?.name as string) || 'paciente')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'paciente'
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `salus-relatorio-${safeName}-${dateStr}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
