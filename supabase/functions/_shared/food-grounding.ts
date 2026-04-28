// deno-lint-ignore-file no-explicit-any
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"
import { embed, toPgVector } from "./embeddings.ts"

/**
 * Given a list of food candidates from Stage 1, look each up in the canonical
 * `foods` table and produce a grounded macro breakdown.
 *
 * Strategy per food:
 *   1. Embed the search_terms[0] (or name) for semantic
 *   2. Call search_foods RPC (barcode/fuzzy/semantic hybrid)
 *   3. Take top match (or null if no decent match found)
 *   4. Compute macros = (DB per-100g values) × (grams / 100)
 *   5. If no DB match, fall back to NULL macros — caller decides whether to ask the LLM
 */

export type Stage1Food = {
  name: string
  search_terms: string[]
  estimated_grams: number
  grams_range?: [number, number]
  cooking_method?: string
  confidence: "high" | "medium" | "low"
  visualReasoning?: string
  alternative_name?: string | null
}

export type GroundedFood = {
  // From Stage 1
  name: string
  estimated_grams: number
  cooking_method?: string
  confidence: "high" | "medium" | "low"
  visualReasoning?: string
  alternative?: string | null

  // From DB lookup
  food_id: string | null
  resolved_name: string | null
  match_score: number
  match_reason: string | null

  // Computed macros (DB × grams)
  estimatedCalories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sodium_mg: number
  micronutrients: Record<string, number>
  isProcessed: boolean
  source: string  // 'taco' | 'openfoodfacts' | 'usda' | 'estimated'
}

const MIN_ACCEPT_SCORE = 0.35  // below this, treat as no match

export async function groundFoods(
  supabase: SupabaseClient,
  foods: Stage1Food[],
): Promise<{
  grounded: GroundedFood[]
  unmatched: Stage1Food[]
  food_refs: Array<{ food_id: string; name_resolved: string; grams: number }>
}> {
  const grounded: GroundedFood[] = []
  const unmatched: Stage1Food[] = []
  const food_refs: Array<{ food_id: string; name_resolved: string; grams: number }> = []

  // Run searches in parallel (capped to keep latency bounded)
  const searches = await Promise.all(
    foods.map(async (f) => {
      const query = (f.search_terms?.[0] ?? f.name ?? "").trim().slice(0, 200)
      if (!query) return { food: f, match: null }

      const queryEmbedding = await embed(query)
      const { data: matches, error } = await supabase.rpc("search_foods", {
        p_query: query,
        p_query_embedding: toPgVector(queryEmbedding),
        p_barcode: null,
        p_limit: 3,
      })
      if (error || !Array.isArray(matches) || matches.length === 0) {
        return { food: f, match: null }
      }

      // Try secondary terms if first didn't yield a strong match
      let best = matches[0]
      if (Number(best.match_score) < MIN_ACCEPT_SCORE && f.search_terms?.length > 1) {
        for (const term of f.search_terms.slice(1, 3)) {
          const termEmbed = await embed(term)
          const { data: more } = await supabase.rpc("search_foods", {
            p_query: term,
            p_query_embedding: toPgVector(termEmbed),
            p_barcode: null,
            p_limit: 1,
          })
          if (Array.isArray(more) && more.length > 0 && Number(more[0].match_score) > Number(best.match_score)) {
            best = more[0]
          }
        }
      }

      return { food: f, match: best }
    }),
  )

  for (const { food, match } of searches) {
    if (!match || Number(match.match_score) < MIN_ACCEPT_SCORE) {
      unmatched.push(food)
      continue
    }
    const ratio = food.estimated_grams / 100
    const macros = {
      estimatedCalories: round(Number(match.kcal_per_100g) * ratio, 0),
      protein_g: round(Number(match.protein_g_per_100g) * ratio, 1),
      carbs_g: round(Number(match.carbs_g_per_100g) * ratio, 1),
      fat_g: round(Number(match.fat_g_per_100g) * ratio, 1),
      fiber_g: round(Number(match.fiber_g_per_100g) * ratio, 1),
      sodium_mg: round(Number(match.micronutrients?.sodium_mg ?? 0) * ratio, 0),
    }
    const micros: Record<string, number> = {}
    if (match.micronutrients && typeof match.micronutrients === "object") {
      for (const [k, v] of Object.entries(match.micronutrients)) {
        if (typeof v === "number") micros[k] = round(v * ratio, 2)
      }
    }
    const isProcessed = match.source === "openfoodfacts" || /ultraprocess|industrializ/i.test(String(match.category ?? ""))

    grounded.push({
      name: food.name,
      estimated_grams: food.estimated_grams,
      cooking_method: food.cooking_method,
      confidence: food.confidence,
      visualReasoning: food.visualReasoning,
      alternative: food.alternative_name ?? null,
      food_id: String(match.id),
      resolved_name: String(match.name),
      match_score: Number(match.match_score),
      match_reason: String(match.match_reason ?? "fuzzy"),
      ...macros,
      micronutrients: micros,
      isProcessed,
      source: String(match.source),
    })
    food_refs.push({
      food_id: String(match.id),
      name_resolved: String(match.name),
      grams: food.estimated_grams,
    })
  }

  return { grounded, unmatched, food_refs }
}

function round(n: number, digits: number): number {
  if (!Number.isFinite(n)) return 0
  const m = 10 ** digits
  return Math.round(n * m) / m
}

/** Sum macros across grounded foods. */
export function sumGrounded(items: GroundedFood[]): {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sodium: number
  micronutrients: Record<string, number>
} {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
    micronutrients: {} as Record<string, number>,
  }
  for (const f of items) {
    totals.calories += f.estimatedCalories
    totals.protein += f.protein_g
    totals.carbs += f.carbs_g
    totals.fat += f.fat_g
    totals.fiber += f.fiber_g
    totals.sodium += f.sodium_mg
    for (const [k, v] of Object.entries(f.micronutrients)) {
      totals.micronutrients[k] = (totals.micronutrients[k] ?? 0) + v
    }
  }
  return totals
}
