// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { authenticate } from "../_shared/auth.ts"
import { checkRateLimit } from "../_shared/rate-limit.ts"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { embed, toPgVector } from "../_shared/embeddings.ts"

/**
 * Hybrid food search: barcode → fuzzy (trigram) → semantic (pgvector).
 *
 * Body: { q: string, barcode?: string, limit?: number, includeUserFoods?: boolean }
 * Returns: { matches: SearchResult[], reason: 'barcode' | 'fuzzy' | 'semantic' | 'mixed' }
 */

type SearchBody = {
  q?: string
  barcode?: string
  limit?: number
  includeUserFoods?: boolean
}

const FUNCTION_NAME = "food-search"

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

    // Light rate limit — search is cheap, but still protect from abuse
    const allowed = await checkRateLimit(supabase, user.id)
    if (!allowed) {
      return jsonResponse({ error: "Rate limit exceeded" }, 429, origin, { "Retry-After": "60" })
    }

    let body: SearchBody
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400, origin)
    }

    const q = String(body.q ?? "").trim().slice(0, 200)
    const barcode = body.barcode ? String(body.barcode).replace(/\D/g, "").slice(0, 14) : null
    const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 50)

    if (!q && !barcode) {
      return jsonResponse({ error: "Query or barcode required" }, 400, origin)
    }

    // Generate query embedding only if we have a meaningful text query.
    // Skip embed cost for barcode-only or trivial queries.
    const embedding = q.length >= 3 ? await embed(q) : null
    const pgVector = toPgVector(embedding)

    const { data: matches, error } = await supabase.rpc("search_foods", {
      p_query: q,
      p_query_embedding: pgVector,
      p_barcode: barcode,
      p_limit: limit,
    })

    if (error) {
      console.error(`${FUNCTION_NAME} RPC error:`, error.message)
      return jsonResponse({ error: "Search failed" }, 500, origin)
    }

    // Optionally also search the caller's own user_foods
    let userMatches: any[] = []
    if (body.includeUserFoods !== false && q) {
      const { data: ufs } = await supabase
        .from("user_foods")
        .select("id,name,brand,barcode,kcal_per_100g,protein_g_per_100g,carbs_g_per_100g,fat_g_per_100g,fiber_g_per_100g,micronutrients")
        .ilike("name", `%${q}%`)
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .limit(5)
      userMatches = (ufs ?? []).map((u) => ({
        ...u,
        source: "user",
        category: null,
        match_score: 0.5,
        match_reason: "user_food",
      }))
    }

    const all = [...(matches ?? []), ...userMatches]
      .sort((a, b) => Number(b.match_score) - Number(a.match_score))
      .slice(0, limit)

    const reason =
      all.length === 0
        ? "none"
        : all[0].match_reason === "barcode"
          ? "barcode"
          : all.some((m) => m.match_reason === "semantic")
            ? "mixed"
            : "fuzzy"

    return jsonResponse({ matches: all, reason }, 200, origin)
  } catch (err) {
    console.error(`${FUNCTION_NAME} unexpected error:`, (err as Error).message)
    return jsonResponse({ error: "Internal server error" }, 500, origin)
  }
})
