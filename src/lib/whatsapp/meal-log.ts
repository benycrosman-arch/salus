/**
 * WhatsApp meal-log pipeline. Two entry points:
 *   - analyzeAndLogTextMeal: patient describes a meal in chat
 *   - analyzeAndLogPhotoMeal: patient sends a photo (with optional caption)
 *
 * Both call Claude server-side with strict JSON output, persist a row in
 * `meals`, update `daily_stats` + `streaks`, and return a short PT/EN reply
 * the caller dispatches back over WhatsApp via Z-API.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

const MODEL = 'claude-sonnet-4-6'

let _client: Anthropic | null = null
function client(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  _client = new Anthropic({ apiKey })
  return _client
}

export interface ParsedFood {
  name: string
  quantity_g: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

export interface MealAnalysis {
  /** false → the message was not a meal description / not a food photo. */
  isMeal: boolean
  meal_type: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner' | 'other'
  foods: ParsedFood[]
  totals: {
    kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
    fiber_g: number
  }
  feedback: string
  /** Why the agent decided this is/isn't a meal. Logged for debugging. */
  reasoning?: string
}

const ANALYSIS_SCHEMA_HINT = `Return ONLY a JSON object matching:
{
  "isMeal": boolean,
  "meal_type": "breakfast" | "snack1" | "lunch" | "snack2" | "dinner" | "other",
  "foods": [{ "name": string, "quantity_g": number, "kcal": number, "protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number }],
  "totals": { "kcal": number, "protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number },
  "feedback": string,
  "reasoning": string
}
Rules:
- If the user is just chatting (not describing a meal or sending food), set isMeal=false and leave foods empty.
- All numeric fields are integers (round if needed).
- "feedback" is one short sentence in the same language as the input — what's good and one tiny improvement.
- meal_type by current local time guess if not stated.
- No prose outside the JSON. No markdown fences.`

const SYSTEM_PT = `Você é o motor de análise nutricional do Salus. Recebe mensagens de WhatsApp do paciente.
Sua única tarefa é decidir se o paciente está REGISTRANDO uma refeição (texto ou foto) e, se sim, estimar macros.
Use porções típicas brasileiras quando o paciente não especificar quantidade. Seja conservador.
${ANALYSIS_SCHEMA_HINT}`

const SYSTEM_EN = `You are Salus's nutrition analysis engine receiving WhatsApp messages from a patient.
Your only job is to decide if the patient is LOGGING a meal (text or photo) and, if so, estimate macros.
Use typical portion sizes when not specified. Be conservative.
${ANALYSIS_SCHEMA_HINT}`

function parseAnalysis(raw: string): MealAnalysis | null {
  // Strip code fences if Claude added them despite instructions.
  let s = raw.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  }
  // Find the first {...} block (defensive).
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  s = s.slice(start, end + 1)
  try {
    const parsed = JSON.parse(s) as MealAnalysis
    if (typeof parsed.isMeal !== 'boolean') return null
    if (!parsed.foods) parsed.foods = []
    if (!parsed.totals) {
      parsed.totals = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
    }
    return parsed
  } catch {
    return null
  }
}

export async function analyzeMealFromText(text: string, locale: 'pt' | 'en' = 'pt'): Promise<MealAnalysis | null> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 800,
    system: locale === 'pt' ? SYSTEM_PT : SYSTEM_EN,
    messages: [{ role: 'user', content: text }],
  })
  const out = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
  return parseAnalysis(out)
}

export async function analyzeMealFromImage(
  imageBase64: string,
  imageMediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
  captionText: string | null,
  locale: 'pt' | 'en' = 'pt',
): Promise<MealAnalysis | null> {
  const userBlocks: Anthropic.ContentBlockParam[] = [
    {
      type: 'image',
      source: { type: 'base64', media_type: imageMediaType, data: imageBase64 },
    },
  ]
  if (captionText && captionText.trim().length > 0) {
    userBlocks.push({ type: 'text', text: captionText.trim() })
  }

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1000,
    system: locale === 'pt' ? SYSTEM_PT : SYSTEM_EN,
    messages: [{ role: 'user', content: userBlocks }],
  })
  const out = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
  return parseAnalysis(out)
}

// ───────────────────────────────────────────────────────────────────────────
// Inbound image fetch is provided by @/lib/zapi/client (fetchInboundImage).
// Re-exported here so existing callers don't need to change imports.
// ───────────────────────────────────────────────────────────────────────────

export { fetchInboundImage } from '@/lib/zapi/client'

// ───────────────────────────────────────────────────────────────────────────
// Persistence — mirrors /api/meals/save, but server-side with a service client.
// ───────────────────────────────────────────────────────────────────────────

function scoreMeal(kcal: number, protein_g: number, fiber_g: number, fat_g: number, carbs_g: number): number {
  let score = 60
  if (protein_g >= 40) score += 15
  else if (protein_g >= 20) score += 8
  if (fiber_g >= 10) score += 10
  else if (fiber_g >= 5) score += 5
  if (kcal > 1200) score -= 10
  else if (kcal < 100) score -= 5
  if (fat_g > 50) score -= 8
  if (carbs_g > 100) score -= 7
  return Math.max(0, Math.min(100, Math.round(score)))
}

function scoreBand(score: number): 'excelente' | 'otimo' | 'bom' | 'atencao' | 'evitar' {
  if (score >= 85) return 'excelente'
  if (score >= 70) return 'otimo'
  if (score >= 50) return 'bom'
  if (score >= 30) return 'atencao'
  return 'evitar'
}

export interface PersistResult {
  mealId: string
  score: number
  band: 'excelente' | 'otimo' | 'bom' | 'atencao' | 'evitar'
}

export async function persistMealLog(params: {
  supabase: SupabaseClient
  userId: string
  analysis: MealAnalysis
  photoUrl?: string | null
  notes?: string | null
}): Promise<PersistResult | null> {
  const { supabase, userId, analysis, photoUrl, notes } = params
  const t = analysis.totals
  const score = scoreMeal(t.kcal, t.protein_g, t.fiber_g, t.fat_g, t.carbs_g)
  const band = scoreBand(score)
  const today = new Date().toISOString().split('T')[0]

  const { data: meal, error: mealError } = await supabase
    .from('meals')
    .insert({
      user_id: userId,
      photo_url: photoUrl ?? null,
      meal_type: analysis.meal_type,
      foods_detected: analysis.foods,
      macros: {
        calories: t.kcal,
        protein: t.protein_g,
        carbs: t.carbs_g,
        fat: t.fat_g,
        fiber: t.fiber_g,
      },
      score,
      score_band: band,
      ai_analysis: { source: 'whatsapp', feedback: analysis.feedback, reasoning: analysis.reasoning },
      user_notes: notes ?? null,
    })
    .select('id')
    .single()

  if (mealError || !meal) return null

  // daily_stats rolling avg
  const { data: existing } = await supabase
    .from('daily_stats')
    .select('avg_score, meals_count')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  const prevCount = existing?.meals_count ?? 0
  const prevAvg = existing?.avg_score ?? 0
  const newCount = prevCount + 1
  const newAvg = Math.round((prevAvg * prevCount + score) / newCount)

  await supabase.from('daily_stats').upsert({
    user_id: userId,
    date: today,
    avg_score: newAvg,
    meals_count: newCount,
    streak_day: true,
  })

  // streaks: bump if last_logged_date is yesterday, hold if today.
  const { data: streak } = await supabase
    .from('streaks')
    .select('current_streak, longest_streak, last_logged_date')
    .eq('user_id', userId)
    .maybeSingle()

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  let current = 1
  let longest = streak?.longest_streak ?? 1
  if (streak?.last_logged_date === today) {
    current = streak.current_streak ?? 1
  } else if (streak?.last_logged_date === yesterdayStr) {
    current = (streak.current_streak ?? 0) + 1
    if (current > longest) longest = current
  }

  await supabase.from('streaks').upsert({
    user_id: userId,
    current_streak: current,
    longest_streak: longest,
    last_logged_date: today,
  })

  return { mealId: meal.id, score, band }
}

// ───────────────────────────────────────────────────────────────────────────
// Reply formatting — short, WhatsApp-friendly.
// ───────────────────────────────────────────────────────────────────────────

const BAND_EMOJI: Record<PersistResult['band'], string> = {
  excelente: '🟢',
  otimo: '🟢',
  bom: '🟡',
  atencao: '🟠',
  evitar: '🔴',
}

export function formatMealReply(
  analysis: MealAnalysis,
  result: PersistResult,
  locale: 'pt' | 'en' = 'pt',
): string {
  const t = analysis.totals
  const emoji = BAND_EMOJI[result.band]
  if (locale === 'en') {
    return [
      `${emoji} Logged. Score: *${result.score}/100*`,
      `${t.kcal} kcal · P ${t.protein_g}g · C ${t.carbs_g}g · F ${t.fat_g}g · Fiber ${t.fiber_g}g`,
      analysis.feedback,
    ].join('\n')
  }
  return [
    `${emoji} Registrado. Score: *${result.score}/100*`,
    `${t.kcal} kcal · Prot ${t.protein_g}g · Carb ${t.carbs_g}g · Gord ${t.fat_g}g · Fibra ${t.fiber_g}g`,
    analysis.feedback,
  ].join('\n')
}

export function notMealReply(locale: 'pt' | 'en' = 'pt'): string {
  return locale === 'en'
    ? 'Send a photo of your plate or describe the meal in text and I’ll log it. (E.g. "rice + black beans + grilled chicken + salad")'
    : 'Manda uma foto do prato ou descreve a refeição em texto que eu registro. (Ex.: "arroz + feijão preto + frango grelhado + salada")'
}

export function errorReply(locale: 'pt' | 'en' = 'pt'): string {
  return locale === 'en'
    ? 'Something glitched on my side. Try again in a moment, or open the app to log directly.'
    : 'Tive um soluço aqui. Tenta de novo em alguns segundos, ou abre o app pra registrar.'
}
