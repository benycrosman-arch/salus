// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { authenticate, serviceClient } from "../_shared/auth.ts"
import { checkRateLimit } from "../_shared/rate-limit.ts"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"

/**
 * Barcode lookup with online fallback.
 *
 * Strategy:
 *   1. Local hit  — `foods` table (canonical, fastest)
 *   2. User hit   — caller's `user_foods` (private)
 *   3. Online hit — OpenFoodFacts API (fetched + cached into `foods` for future calls)
 *   4. Miss      — return 404; client opens manual-add form
 */

const FUNCTION_NAME = "barcode-lookup"

type OffProduct = {
  status: number
  product?: {
    product_name?: string
    product_name_pt?: string
    brands?: string
    code?: string
    categories?: string
    nutriments?: Record<string, number>
    image_url?: string
  }
}

const num = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(",", "."))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

serve(async (req) => {
  const origin = req.headers.get("Origin")

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin)
  }

  try {
    const auth = await authenticate(req)
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status, origin)
    const { user, supabase } = auth

    const allowed = await checkRateLimit(supabase, user.id)
    if (!allowed) {
      return jsonResponse({ error: "Rate limit exceeded" }, 429, origin, { "Retry-After": "60" })
    }

    let body: any
    try { body = await req.json() } catch { return jsonResponse({ error: "Invalid JSON" }, 400, origin) }

    const barcode = String(body.barcode ?? "").replace(/\D/g, "")
    if (barcode.length < 8 || barcode.length > 14) {
      return jsonResponse({ error: "Invalid barcode (need 8–14 digits)" }, 400, origin)
    }

    // 1. Canonical foods
    const { data: canon } = await supabase
      .from("foods")
      .select("id,name,brand,barcode,kcal_per_100g,protein_g_per_100g,carbs_g_per_100g,fat_g_per_100g,fiber_g_per_100g,micronutrients,source,category")
      .eq("barcode", barcode)
      .maybeSingle()
    if (canon) {
      return jsonResponse({ source: "canonical", food: canon }, 200, origin)
    }

    // 2. User foods
    const { data: own } = await supabase
      .from("user_foods")
      .select("*")
      .eq("barcode", barcode)
      .eq("user_id", user.id)
      .maybeSingle()
    if (own) {
      return jsonResponse({ source: "user", food: own }, 200, origin)
    }

    // 3. OpenFoodFacts online fallback
    const offUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,product_name_pt,brands,code,categories,nutriments,image_url`
    let off: OffProduct | null = null
    try {
      const r = await fetch(offUrl, { headers: { "User-Agent": "Salus/1.0 (https://nulllabs.org)" } })
      if (r.ok) off = await r.json() as OffProduct
    } catch (err) {
      console.warn("OFF fetch failed:", (err as Error).message)
    }

    if (!off || off.status !== 1 || !off.product) {
      return jsonResponse({ source: "miss", food: null, barcode }, 404, origin)
    }

    const p = off.product
    const n = p.nutriments ?? {}

    const food = {
      name: (p.product_name_pt || p.product_name || "Produto").trim().slice(0, 200),
      brand: p.brands?.split(",")[0]?.trim().slice(0, 100) ?? null,
      barcode,
      source: "openfoodfacts" as const,
      source_id: p.code ?? barcode,
      category: p.categories?.split(",")[0]?.trim().slice(0, 100) ?? null,
      kcal_per_100g: num(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? n.energy_100g / 4.184),
      protein_g_per_100g: num(n.proteins_100g ?? n.proteins),
      carbs_g_per_100g: num(n.carbohydrates_100g ?? n.carbohydrates),
      fat_g_per_100g: num(n.fat_100g ?? n.fat),
      fiber_g_per_100g: num(n.fiber_100g ?? n.fiber),
      sugar_g_per_100g: num(n.sugars_100g ?? n.sugars),
      sodium_mg_per_100g: num(n.sodium_100g) * 1000,
      micronutrients: {
        salt_g: num(n.salt_100g),
        saturated_fat_g: num(n["saturated-fat_100g"]),
      },
      data_quality: 70, // OFF is community-edited, not gov-grade
      is_verified: false,
    }

    // Cache into canonical table for future lookups (service role)
    const service = serviceClient()
    const { data: inserted, error: insertErr } = await service
      .from("foods")
      .upsert(food, { onConflict: "source,source_id" })
      .select("id,name,brand,barcode,kcal_per_100g,protein_g_per_100g,carbs_g_per_100g,fat_g_per_100g,fiber_g_per_100g,micronutrients,source,category")
      .single()
    if (insertErr) {
      console.warn("Failed to cache OFF result:", insertErr.message)
      return jsonResponse({ source: "openfoodfacts", food, cached: false }, 200, origin)
    }

    return jsonResponse({ source: "openfoodfacts", food: inserted, cached: true }, 200, origin)
  } catch (err) {
    console.error(`${FUNCTION_NAME} unexpected error:`, (err as Error).message)
    return jsonResponse({ error: "Internal server error" }, 500, origin)
  }
})
