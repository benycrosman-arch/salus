/**
 * TACO Seed Script
 *
 * Loads the Tabela Brasileira de Composição de Alimentos (4th edition, 597 foods)
 * into the canonical `foods` table with optional OpenAI embeddings for semantic search.
 *
 * Setup:
 *   1. Download a community TACO JSON. Recommended sources:
 *      - https://github.com/luiztools/tabela-taco
 *      - https://github.com/AnthonyFGD/Tabela-TACO-em-JSON
 *      Place the file at scripts/data/taco.json
 *   2. Set env vars (in .env.local or shell):
 *      - NEXT_PUBLIC_SUPABASE_URL
 *      - SUPABASE_SERVICE_ROLE_KEY (required — bypasses RLS for canonical insert)
 *      - OPENAI_API_KEY (optional — without it, fuzzy search still works; semantic disabled)
 *   3. Run: npx tsx scripts/seed-taco.ts
 *
 * Idempotent: re-running upserts based on (source, source_id).
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'

// ─── Types ──────────────────────────────────────────────────

type TacoFood = {
  id: number
  descricao?: string
  description?: string
  nome?: string
  categoria?: string
  category?: string
  // Per 100g
  energia_kcal?: number
  energy_kcal?: number
  kcal?: number
  proteina_g?: number
  protein_g?: number
  lipidios_g?: number
  fat_g?: number
  carboidrato_g?: number
  carbs_g?: number
  fibra_alimentar_g?: number
  fiber_g?: number
  // Micros (per 100g)
  calcio_mg?: number
  magnesio_mg?: number
  manganes_mg?: number
  fosforo_mg?: number
  ferro_mg?: number
  sodio_mg?: number
  potassio_mg?: number
  cobre_mg?: number
  zinco_mg?: number
  retinol_mcg?: number
  re_mcg?: number
  rae_mcg?: number
  tiamina_mg?: number
  riboflavina_mg?: number
  piridoxina_mg?: number
  niacina_mg?: number
  vitamina_c_mg?: number
}

type FoodInsert = {
  name: string
  source: 'taco'
  source_id: string
  category: string | null
  kcal_per_100g: number
  protein_g_per_100g: number
  carbs_g_per_100g: number
  fat_g_per_100g: number
  fiber_g_per_100g: number
  micronutrients: Record<string, number>
  data_quality: number
  is_verified: boolean
  embedding: string | null
}

// ─── Helpers ────────────────────────────────────────────────

const num = (v: unknown): number => {
  if (v == null) return 0
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const cleaned = v.replace(',', '.').trim()
    if (cleaned === '' || cleaned === '*' || cleaned === '-' || cleaned === 'Tr') return 0
    const n = Number.parseFloat(cleaned)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

const pickName = (f: TacoFood): string =>
  String(f.descricao ?? f.description ?? f.nome ?? '').trim()

const pickCategory = (f: TacoFood): string | null => {
  const c = f.categoria ?? f.category
  return c ? String(c).trim() : null
}

const buildMicros = (f: TacoFood): Record<string, number> => {
  // Use ISO-ish keys consistent across the app
  const m: Record<string, number> = {}
  if (f.calcio_mg != null) m.calcium_mg = num(f.calcio_mg)
  if (f.magnesio_mg != null) m.magnesium_mg = num(f.magnesio_mg)
  if (f.manganes_mg != null) m.manganese_mg = num(f.manganes_mg)
  if (f.fosforo_mg != null) m.phosphorus_mg = num(f.fosforo_mg)
  if (f.ferro_mg != null) m.iron_mg = num(f.ferro_mg)
  if (f.sodio_mg != null) m.sodium_mg = num(f.sodio_mg)
  if (f.potassio_mg != null) m.potassium_mg = num(f.potassio_mg)
  if (f.cobre_mg != null) m.copper_mg = num(f.cobre_mg)
  if (f.zinco_mg != null) m.zinc_mg = num(f.zinco_mg)
  if (f.retinol_mcg != null) m.retinol_mcg = num(f.retinol_mcg)
  if (f.rae_mcg != null) m.vit_a_mcg = num(f.rae_mcg)
  if (f.re_mcg != null && m.vit_a_mcg == null) m.vit_a_mcg = num(f.re_mcg)
  if (f.tiamina_mg != null) m.thiamin_mg = num(f.tiamina_mg)
  if (f.riboflavina_mg != null) m.riboflavin_mg = num(f.riboflavina_mg)
  if (f.piridoxina_mg != null) m.vit_b6_mg = num(f.piridoxina_mg)
  if (f.niacina_mg != null) m.niacin_mg = num(f.niacina_mg)
  if (f.vitamina_c_mg != null) m.vit_c_mg = num(f.vitamina_c_mg)
  return m
}

const mapToInsert = (f: TacoFood): FoodInsert | null => {
  const name = pickName(f)
  if (!name || f.id == null) return null
  return {
    name,
    source: 'taco',
    source_id: String(f.id),
    category: pickCategory(f),
    kcal_per_100g: num(f.energia_kcal ?? f.energy_kcal ?? f.kcal),
    protein_g_per_100g: num(f.proteina_g ?? f.protein_g),
    carbs_g_per_100g: num(f.carboidrato_g ?? f.carbs_g),
    fat_g_per_100g: num(f.lipidios_g ?? f.fat_g),
    fiber_g_per_100g: num(f.fibra_alimentar_g ?? f.fiber_g),
    micronutrients: buildMicros(f),
    data_quality: 95, // TACO is the gold standard for Brazilian foods
    is_verified: true,
    embedding: null,
  }
}

// ─── OpenAI embeddings (optional) ───────────────────────────

const OPENAI_KEY = process.env.OPENAI_API_KEY
const EMBED_MODEL = 'text-embedding-3-small' // 1536 dim
const EMBED_BATCH = 100

async function embedBatch(texts: string[]): Promise<number[][] | null> {
  if (!OPENAI_KEY) return null
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`OpenAI embedding error ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data = (await res.json()) as { data: Array<{ embedding: number[] }> }
  return data.data.map((d) => d.embedding)
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error(
      '✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env',
    )
    process.exit(1)
  }
  if (!OPENAI_KEY) {
    console.warn('⚠ OPENAI_API_KEY not set — semantic search disabled. Fuzzy still works.')
  }

  const dataPath = path.join(process.cwd(), 'scripts', 'data', 'taco.json')
  let raw: string
  try {
    raw = await fs.readFile(dataPath, 'utf8')
  } catch {
    console.error(`✗ Could not read ${dataPath}`)
    console.error('  Download a community TACO JSON and place it there. See script header.')
    process.exit(1)
  }

  const parsed = JSON.parse(raw)
  const list: TacoFood[] = Array.isArray(parsed)
    ? parsed
    : (parsed.alimentos ?? parsed.foods ?? parsed.data ?? [])
  if (!Array.isArray(list) || list.length === 0) {
    console.error('✗ TACO JSON has no foods. Check the file structure.')
    process.exit(1)
  }
  console.log(`✓ Loaded ${list.length} TACO entries`)

  const inserts: FoodInsert[] = []
  for (const f of list) {
    const row = mapToInsert(f)
    if (row && row.kcal_per_100g >= 0) inserts.push(row)
  }
  console.log(`✓ Mapped ${inserts.length} valid foods`)

  // Embeddings (batched)
  if (OPENAI_KEY) {
    console.log(`→ Generating embeddings (${EMBED_MODEL}, batch ${EMBED_BATCH})...`)
    for (let i = 0; i < inserts.length; i += EMBED_BATCH) {
      const slice = inserts.slice(i, i + EMBED_BATCH)
      const texts = slice.map((r) => `${r.name}${r.category ? ` (${r.category})` : ''}`)
      try {
        const vectors = await embedBatch(texts)
        if (vectors) {
          for (let j = 0; j < slice.length; j++) {
            slice[j].embedding = `[${vectors[j].join(',')}]`
          }
        }
      } catch (err) {
        console.warn(`  batch ${i}-${i + slice.length} failed: ${(err as Error).message}`)
      }
      process.stdout.write(`  embedded ${Math.min(i + EMBED_BATCH, inserts.length)}/${inserts.length}\r`)
    }
    console.log('')
  }

  // Upsert to Supabase
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const UPSERT_BATCH = 50
  let inserted = 0
  for (let i = 0; i < inserts.length; i += UPSERT_BATCH) {
    const slice = inserts.slice(i, i + UPSERT_BATCH)
    const { error } = await supabase
      .from('foods')
      .upsert(slice, { onConflict: 'source,source_id' })
    if (error) {
      console.error(`✗ Upsert batch ${i} failed: ${error.message}`)
      process.exit(1)
    }
    inserted += slice.length
    process.stdout.write(`  upserted ${inserted}/${inserts.length}\r`)
  }
  console.log('')

  // Default servings — every food gets a "100g" baseline + 1 portion proxy
  console.log('→ Inserting default servings (100g + porção)...')
  const { data: ids } = await supabase
    .from('foods')
    .select('id')
    .eq('source', 'taco')
  if (ids?.length) {
    const servings = ids.flatMap(({ id }) => [
      { food_id: id, unit: 'g', unit_label_pt: '100g', grams: 100, is_default: false },
      { food_id: id, unit: 'porção', unit_label_pt: 'porção', grams: 100, is_default: true },
    ])
    for (let i = 0; i < servings.length; i += UPSERT_BATCH) {
      const slice = servings.slice(i, i + UPSERT_BATCH)
      const { error } = await supabase.from('food_servings').insert(slice)
      if (error && !error.message.includes('duplicate')) {
        console.warn(`  servings batch ${i} warn: ${error.message}`)
      }
    }
  }

  console.log(`✓ Done. ${inserts.length} foods seeded.`)
  if (OPENAI_KEY) {
    console.log('  Run `analyze foods;` in SQL editor to refresh ivfflat statistics.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
