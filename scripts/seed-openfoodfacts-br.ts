/**
 * OpenFoodFacts Brazil Seed Script
 *
 * Loads packaged products sold in Brazil (or labeled in Portuguese) from
 * OpenFoodFacts into the canonical `foods` table.
 *
 * The full OFF dump is ~9 GB. This script uses the country-filtered JSONL export
 * available at:
 *   https://world.openfoodfacts.org/data
 *
 * Setup:
 *   1. Download "openfoodfacts-products.jsonl.gz" (full) OR query the search API
 *      for `countries_tags=brazil` and save as scripts/data/off-br.jsonl.
 *      Quick path:
 *      curl -L -o scripts/data/off-br.jsonl.gz \
 *        "https://world.openfoodfacts.org/cgi/search.pl?action=process&tagtype_0=countries&tag_contains_0=contains&tag_0=brazil&page_size=1000&json=1&download=on"
 *      (OR use a community partial dump)
 *   2. gunzip scripts/data/off-br.jsonl.gz
 *   3. Set env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, optional OPENAI_API_KEY)
 *   4. Run: npm run seed:openfoodfacts
 *
 * The script:
 *   - Streams the JSONL line-by-line (does not load all into memory)
 *   - Filters: must have product_name, code (barcode), and a non-zero kcal value
 *   - Maps to the foods schema
 *   - Embeds in batches of 100 (if OPENAI_API_KEY)
 *   - Upserts in batches of 50 by (source, source_id)
 *
 * Run is idempotent — re-running updates instead of duplicating.
 */

import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"
import path from "node:path"
import readline from "node:readline"

type OffRaw = {
  code?: string
  product_name?: string
  product_name_pt?: string
  brands?: string
  categories?: string
  countries_tags?: string[]
  nutriments?: Record<string, unknown>
  image_url?: string
  states_tags?: string[]
}

type FoodInsert = {
  name: string
  brand: string | null
  barcode: string
  source: "openfoodfacts"
  source_id: string
  category: string | null
  kcal_per_100g: number
  protein_g_per_100g: number
  carbs_g_per_100g: number
  fat_g_per_100g: number
  fiber_g_per_100g: number
  sugar_g_per_100g: number
  sodium_mg_per_100g: number
  micronutrients: Record<string, number>
  data_quality: number
  is_verified: boolean
  embedding: string | null
}

const num = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(",", "."))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

const dataQualityFromStates = (tags: string[] | undefined): number => {
  if (!tags) return 50
  let score = 50
  if (tags.includes("en:nutrition-facts-completed")) score += 20
  if (tags.includes("en:photos-validated")) score += 10
  if (tags.includes("en:packaging-photo-selected")) score += 5
  if (tags.includes("en:characteristics-completed")) score += 5
  return Math.min(95, score)
}

const mapRow = (r: OffRaw): FoodInsert | null => {
  const code = (r.code ?? "").replace(/\D/g, "")
  if (code.length < 8 || code.length > 14) return null
  const name = (r.product_name_pt || r.product_name || "").trim()
  if (!name || name.length < 2) return null

  const n = r.nutriments ?? {}
  const kcal = num(
    n["energy-kcal_100g"] ?? n["energy-kcal"] ??
    (num(n["energy_100g"] ?? n["energy"]) / 4.184)
  )
  if (kcal <= 0) return null // skip products without nutrition data

  return {
    name: name.slice(0, 200),
    brand: r.brands?.split(",")[0]?.trim().slice(0, 100) || null,
    barcode: code,
    source: "openfoodfacts",
    source_id: code,
    category: r.categories?.split(",")[0]?.trim().slice(0, 100) ?? null,
    kcal_per_100g: kcal,
    protein_g_per_100g: num(n["proteins_100g"]),
    carbs_g_per_100g: num(n["carbohydrates_100g"]),
    fat_g_per_100g: num(n["fat_100g"]),
    fiber_g_per_100g: num(n["fiber_100g"]),
    sugar_g_per_100g: num(n["sugars_100g"]),
    sodium_mg_per_100g: num(n["sodium_100g"]) * 1000,
    micronutrients: {
      salt_g: num(n["salt_100g"]),
      saturated_fat_g: num(n["saturated-fat_100g"]),
      ...(num(n["calcium_100g"]) > 0 ? { calcium_mg: num(n["calcium_100g"]) * 1000 } : {}),
      ...(num(n["iron_100g"]) > 0 ? { iron_mg: num(n["iron_100g"]) * 1000 } : {}),
    },
    data_quality: dataQualityFromStates(r.states_tags),
    is_verified: false,
    embedding: null,
  }
}

// ─── OpenAI embeddings (batched) ───────────────────────────

const OPENAI_KEY = process.env.OPENAI_API_KEY
const EMBED_MODEL = "text-embedding-3-small"
const EMBED_BATCH = 100

async function embedBatch(texts: string[]): Promise<number[][] | null> {
  if (!OPENAI_KEY) return null
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data = (await res.json()) as { data: Array<{ embedding: number[] }> }
  return data.data.map((d) => d.embedding)
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("✗ Missing Supabase env vars")
    process.exit(1)
  }
  if (!OPENAI_KEY) {
    console.warn("⚠ OPENAI_API_KEY not set — semantic disabled (fuzzy still works).")
  }

  const dataPath = path.join(process.cwd(), "scripts", "data", "off-br.jsonl")
  if (!fs.existsSync(dataPath)) {
    console.error(`✗ Could not read ${dataPath}`)
    console.error("  Download OpenFoodFacts BR JSONL — see script header.")
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const stream = fs.createReadStream(dataPath, "utf8")
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  const BATCH_SIZE = 50
  const buffer: FoodInsert[] = []
  let total = 0
  let inserted = 0
  let skipped = 0

  const flush = async () => {
    if (buffer.length === 0) return

    // Embed
    if (OPENAI_KEY) {
      try {
        const texts = buffer.map((r) => `${r.name}${r.brand ? ` — ${r.brand}` : ""}`)
        const vectors = await embedBatch(texts)
        if (vectors) {
          for (let i = 0; i < buffer.length; i++) {
            buffer[i].embedding = `[${vectors[i].join(",")}]`
          }
        }
      } catch (err) {
        console.warn(`embed batch failed: ${(err as Error).message}`)
      }
    }

    const { error } = await supabase
      .from("foods")
      .upsert(buffer, { onConflict: "source,source_id" })
    if (error) {
      console.warn(`upsert batch failed: ${error.message}`)
    } else {
      inserted += buffer.length
    }
    buffer.length = 0
    process.stdout.write(`  processed=${total} inserted=${inserted} skipped=${skipped}\r`)
  }

  for await (const line of rl) {
    if (!line.trim()) continue
    total++
    try {
      const raw = JSON.parse(line) as OffRaw
      // Brazil filter (the dump may contain non-BR products if the user got the full one)
      const isBR =
        raw.countries_tags?.includes("en:brazil") ||
        raw.countries_tags?.some((t) => t.endsWith(":brazil"))
      if (!isBR) {
        skipped++
        continue
      }
      const mapped = mapRow(raw)
      if (!mapped) {
        skipped++
        continue
      }
      buffer.push(mapped)
      if (buffer.length >= BATCH_SIZE) await flush()
    } catch {
      skipped++
    }
  }

  await flush()
  console.log(`\n✓ Done. total=${total} inserted=${inserted} skipped=${skipped}`)
  if (OPENAI_KEY) console.log("  Run `ANALYZE foods;` to refresh ivfflat statistics.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
