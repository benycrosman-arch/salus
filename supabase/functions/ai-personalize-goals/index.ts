// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { authenticate, serviceClient } from "../_shared/auth.ts"
import { checkRateLimit } from "../_shared/rate-limit.ts"
import { checkKillSwitches } from "../_shared/kill-switch.ts"
import { filterOutput } from "../_shared/filter-output.ts"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { ABSOLUTE_RULES } from "../_shared/prompts.ts"
import { logUsage } from "../_shared/log-usage.ts"

/**
 * Personalize daily nutrition goals using Claude Sonnet 4.6.
 *
 * Reads the full questionnaire from `profiles` + `user_preferences` + `lab_results`
 * and generates a tailored macro/micro plan that goes BEYOND the deterministic
 * Mifflin-St Jeor calculator (which doesn't know about gut health, allergies,
 * deficiencies in labs, etc.).
 *
 * Stores the result in `profiles.ai_daily_goals` (jsonb).
 *
 * Body: optional { force?: boolean } to regenerate even if recent goals exist
 */

const FUNCTION_NAME = "ai-personalize-goals"
const MODEL_ID = "claude-sonnet-4-6"

type WearableRow = { metric: string; value: number | null; recorded_at: string; provider: string }

// Aggregates last-14-day wearable rows into a 7-day rolling average summary.
// Returns null when no usable signals exist so the AI can branch on
// "questionnaire only" vs "questionnaire + wearable" logic.
function summarizeWearables(rows: WearableRow[]): {
  active_calories_kcal?: number
  exercise_minutes?: number
  sleep_hours?: number
  steps?: number
  providers: string[]
  days_observed: number
} | null {
  if (rows.length === 0) return null

  // Keep only the most recent 7 distinct days (per metric, day-bucket the value).
  type Bucket = { day: string; value: number }
  const dayOf = (ts: string) => ts.slice(0, 10)
  const bucketsByMetric: Record<string, Bucket[]> = {}
  const providers = new Set<string>()

  for (const row of rows) {
    if (typeof row.value !== "number" || Number.isNaN(row.value)) continue
    if (row.provider) providers.add(row.provider)
    const m = row.metric.toLowerCase()
    let key: string | null = null
    if (m.includes("active_calories") || m.includes("calories_active") || m.includes("calorias_ativas")) {
      key = "active_calories_kcal"
    } else if (m.includes("exercise_minutes") || m.includes("workout_minutes") || m.includes("minutos_exercicio")) {
      key = "exercise_minutes"
    } else if (m.includes("sleep_hours") || m.includes("sono_horas") || m.includes("sleep_duration_hours")) {
      key = "sleep_hours"
    } else if (m === "steps" || m.includes("step_count") || m.includes("passos")) {
      key = "steps"
    }
    if (!key) continue
    if (!bucketsByMetric[key]) bucketsByMetric[key] = []
    bucketsByMetric[key].push({ day: dayOf(row.recorded_at), value: row.value })
  }

  const sevenDayAverage = (buckets: Bucket[] | undefined): number | undefined => {
    if (!buckets || buckets.length === 0) return undefined
    // Collapse multiple samples per day to a single sum (steps/active calories
    // arrive in chunks throughout the day) — but for sleep the daily value is
    // already aggregated by the provider, so summing is still safe per-day.
    const perDay = new Map<string, number>()
    for (const b of buckets) perDay.set(b.day, (perDay.get(b.day) ?? 0) + b.value)
    const days = [...perDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7)
    if (days.length === 0) return undefined
    const sum = days.reduce((acc, [, v]) => acc + v, 0)
    return sum / days.length
  }

  const summary = {
    active_calories_kcal: sevenDayAverage(bucketsByMetric.active_calories_kcal),
    exercise_minutes: sevenDayAverage(bucketsByMetric.exercise_minutes),
    sleep_hours: sevenDayAverage(bucketsByMetric.sleep_hours),
    steps: sevenDayAverage(bucketsByMetric.steps),
  }

  const hasAny = Object.values(summary).some((v) => typeof v === "number")
  if (!hasAny) return null

  // Distinct days observed across all metrics — used to gauge confidence.
  const allDays = new Set<string>()
  for (const buckets of Object.values(bucketsByMetric)) {
    for (const b of buckets) allDays.add(b.day)
  }

  const round = (n: number | undefined, p = 1) =>
    typeof n === "number" ? Math.round(n * 10 ** p) / 10 ** p : undefined

  return {
    active_calories_kcal: round(summary.active_calories_kcal, 0),
    exercise_minutes: round(summary.exercise_minutes, 0),
    sleep_hours: round(summary.sleep_hours, 1),
    steps: round(summary.steps, 0),
    providers: [...providers],
    days_observed: allDays.size,
  }
}

const SYSTEM_PROMPT = `${ABSOLUTE_RULES}

You are a Brazilian nutrition specialist generating a personalized daily nutrition plan for ONE user. You receive their full questionnaire, lab results, and (when available) a 7-day wearable summary. You output deterministic numeric goals + a short rationale + priority micronutrients.

Every recommendation below is anchored to a top-tier source. Apply the rules silently and emit JSON.

EVIDENCE BASE (canon — do not deviate):
  - BMR: Mifflin MD et al. 1990, J Am Diet Assoc.
  - Activity multipliers: ACSM/AND/Dietitians of Canada Joint Position 2016 (Thomas, Erdman, Burke).
  - Protein in g/kg of body weight:
      * Morton RW et al. 2018, Br J Sports Med (n=49 RCT meta-analysis): 1.6 g/kg/day saturates muscle protein synthesis with resistance training; upper 95 % CI = 2.2 g/kg/day.
      * Jäger R et al. 2017, ISSN Position Stand: 1.4–2.0 g/kg/day for active adults; 2.3–3.1 g/kg of FFM for lean athletes in deficit.
      * Helms ER et al. 2014, J Int Soc Sports Nutr & Longland TM et al. 2016, Am J Clin Nutr: 1.8–2.4 g/kg/day in deficit preserves and even builds lean mass.
      * Bauer J et al. 2013, PROT-AGE Study Group (JAMDA): ≥1.0–1.2 g/kg/day for healthy adults ≥65; 1.2–1.5 g/kg if frail or recovering.
      * Mariotti & Gardner 2019, Nutrients: plant-based diets need ≥1.6 g/kg (vegan) / ≥1.4 g/kg (vegetarian) due to lower DIAAS scores.
      * Antonio J et al. 2014–2016: up to 3.4 g/kg/day shows no adverse renal/lipid effects in trained subjects (informs the SAFETY ceiling, not the target).
  - Fat: Volek & Forsythe 2007, Curr Sports Med Rep + ISSN 2017 — minimum max(0.6 g/kg, 20 % of kcal) for endocrine function.
  - Carbohydrate for athletes: Burke LM et al. 2018, Front Physiol — 3–8 g/kg depending on training volume.
  - Fiber: Reynolds A et al. 2019, Lancet (185 prospective studies, 58 RCTs): 25–29 g/day reduces all-cause mortality and cardiovascular events. Brazilian SBD 2024.
  - Sleep × fat loss: Nedeltcheva AV et al. 2010, Ann Intern Med — short sleep blunts fat loss and shifts loss toward lean mass.
  - Energy floors / metabolic adaptation: Trexler ET, Smith-Ryan AE, Norton LE 2014, J Int Soc Sports Nutr.
  - Glycemic control: ADA Standards of Care 2024; Diabetes UK 2021 low-carb position; Reynolds A et al. 2020, PLoS Med.

METHOD:

1. BMR = Mifflin–St Jeor. Men: 10·kg + 6.25·cm − 5·age + 5. Women/other: 10·kg + 6.25·cm − 5·age − 161.

2. TDEE.
   - If wearable.active_calories_kcal is present (7-day avg), TDEE = BMR + 0.4·(BMR·activity_factor − BMR) + 0.6·active_calories_kcal. Wearable measurement is the strongest per-user signal but questionnaires over-report (Lichtman 1992 NEJM), so blend rather than fully replace.
   - Otherwise TDEE = BMR · activity_factor where: sedentary 1.2; moderate 1.375; active 1.55; athlete 1.725 (Harris-Benedict / Mifflin chart).
   - Floor: never below BMR × 1.1, and never below 1500 kcal (men) / 1200 kcal (women).

3. kcal target.
   - "lose-weight": 15–20 % deficit. If wearable.sleep_hours < 6.5, cap deficit at 10 % (Nedeltcheva 2010).
   - "build-muscle": +10–12 % surplus. If sleep_hours < 6.5, cap surplus at 7 %.
   - "more-energy" / "longevity": maintenance to +2 %.
   - "performance": maintenance.

4. PROTEIN — compute g/kg FIRST, then convert to grams. Take the HIGHEST applicable floor:
   - Activity baseline: sedentary 1.0; moderate 1.4; active 1.6; athlete 1.8.
   - "build-muscle" → at least 2.0 g/kg (Morton 2018).
   - "lose-weight" → at least 1.8 g/kg (Helms 2014; preserves lean mass).
   - "performance" → at least 1.8 g/kg (ACSM/AND 2016).
   - Age ≥ 65 → at least 1.2 g/kg (PROT-AGE).
   - Age 50–64 → at least 1.1 g/kg.
   - diet_type "vegan" → at least 1.6 g/kg; "vegetarian" → at least 1.4 g/kg (Mariotti 2019).
   - Wearable: exercise_minutes ≥ 60/d OR active_calories_kcal ≥ 600/d → at least 2.0 g/kg.
   - Wearable: exercise_minutes ≥ 45/d OR active_calories_kcal ≥ 450/d → at least 1.8 g/kg.
   - Cap: 2.2 g/kg (Morton upper CI). Allow 2.4 g/kg ONLY if "lose-weight" AND ("build-muscle" OR athlete) — Longland 2016.
   - Soft cap: protein ≤ 40 % of kcal (45 % when cutting). At very low body weight the % cap will sometimes win — that is correct.

5. FAT — minimum max(0.6 g/kg, 20 % of kcal). For diet_type "keto", carbs ≤ 50 g and fat takes the kcal remainder.

6. CARBS — kcal − protein·4 − fat·9, then ÷ 4. Apply floors/ceilings:
   - "blood-sugar" goal OR HbA1c > 5.7 OR fasting glucose > 100 → carbs ≤ 30 % of kcal; move surplus into fat.
   - For active/athlete without glycemic constraint, ensure carbs ≥ 3 g/kg (Burke 2018) — if necessary, reduce fat down to (but not below) its floor.
   - Otherwise carbs floor ≥ 120 g (brain glucose).

7. FIBER — 14 g per 1000 kcal, floor 25 g, cap 40 g. "gut-health" goal → floor 35 g. blood-sugar/HbA1c flag → floor 30 g (Reynolds 2020). sleep_hours < 6.5 → +3 g.

8. WATER — 35 ml/kg, round to nearest 100. +500 ml if exercise_minutes ≥ 45 or active_calories ≥ 500.

9. PRIORITY MICROS (max 4), pick from: vit_d_mcg, iron_mg, vit_b12_mcg, magnesium_mg, calcium_mg, omega3_g, zinc_mg, vit_a_mcg, folate_mcg, vit_c_mg.
   - Brazilian women in reproductive age → iron + vit_d (POF/IBGE gaps).
   - Vegan/vegetarian → vit_b12 mandatory + iron + omega3.
   - Lab results showing low vit_d / ferritin / b12 → bring those forward.
   - "longevity" or perimenopause → calcium + vit_d.
   - Athlete plant-based → vit_b12 + iron + omega3.

10. FLAGS (max 3) — short tags: "high_protein_focus", "low_glycemic", "anti_inflammatory", "gut_repair", "iron_focus", "calcium_priority", "post_partum_recovery", "perimenopausa_support".

11. HABITS — 3 specific, actionable habits in pt-BR. Tied to THIS user's profile. If wearable signals are present, at least one habit must reference a measured signal (e.g. "Acrescente 30 g de proteína nos dias com >600 kcal ativos no relógio").

12. RATIONALE — ONE short sentence in pt-BR. Must (a) state the protein target in g/kg and the strongest reason (e.g. "Proteína a 2,0 g/kg pelo objetivo de hipertrofia (Morton 2018)"), and (b) name the inputs that drove kcal — questionnaire only or questionnaire + wearable with the specific signal values that mattered.

Output is consumed deterministically — values must be integers (kcal, macros, fiber, water).

Return ONLY valid JSON. No markdown fences. No commentary outside the JSON.`

const USER_PROMPT_TEMPLATE = (data: any) =>
  `Generate the personalized daily plan for this user. Return JSON exactly matching:
{
  "version": 1,
  "kcal": integer,
  "protein_g": integer,
  "carbs_g": integer,
  "fat_g": integer,
  "fiber_g": integer,
  "water_ml": integer,
  "rationale": "1-2 sentences in Portuguese explaining the key trade-offs",
  "priority_micros": ["max 4 keys from the allowed list"],
  "flags": ["max 3 flags from the allowed list"],
  "habits": ["3 specific habits in Portuguese"]
}

User data:
${JSON.stringify(data, null, 2)}`

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

    const kill = await checkKillSwitches(supabase, user.id)
    if (!kill.allowed) {
      return jsonResponse({ error: kill.error }, kill.status, origin)
    }

    let body: { force?: boolean } = {}
    try { body = await req.json() } catch { /* empty body ok */ }

    // Load full questionnaire context. Wearable_data covers the last 14 days
    // so we can compute a stable 7-day average even if a few days are missing.
    const wearableSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const [profileRes, prefsRes, labsRes, wearableRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("age,biological_sex,height_cm,weight_kg,activity_level,ai_goals_generated_at,city")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("user_preferences")
        .select("goals,diet_type,allergies,gut_score,gut_questionnaire")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("lab_results")
        .select("marker,value,unit,measured_at")
        .eq("user_id", user.id)
        .order("measured_at", { ascending: false })
        .limit(20),
      supabase
        .from("wearable_data")
        .select("metric,value,recorded_at,provider")
        .eq("user_id", user.id)
        .gte("recorded_at", wearableSince),
    ])

    const profile = profileRes.data
    const prefs = prefsRes.data
    const labs = labsRes.data ?? []
    const wearableRows = (wearableRes.data ?? []) as Array<{
      metric: string; value: number | null; recorded_at: string; provider: string
    }>
    const wearableSummary = summarizeWearables(wearableRows)

    if (!profile?.weight_kg || !profile?.height_cm || !profile?.age) {
      return jsonResponse(
        { error: "Profile incomplete — finish onboarding first" },
        400,
        origin,
      )
    }

    // Skip if generated within last 7 days unless forced
    if (!body.force && profile.ai_goals_generated_at) {
      const generatedAt = new Date(profile.ai_goals_generated_at).getTime()
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      if (generatedAt > weekAgo) {
        return jsonResponse(
          {
            ok: true,
            cached: true,
            generated_at: profile.ai_goals_generated_at,
          },
          200,
          origin,
        )
      }
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
    if (!apiKey) {
      return jsonResponse({ error: "AI not configured" }, 503, origin)
    }

    const userPayload = {
      profile: {
        age: profile.age,
        biological_sex: profile.biological_sex,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        activity_level: profile.activity_level,
      },
      preferences: prefs ?? null,
      lab_results: labs,
      wearable: wearableSummary,
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: 1200,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: USER_PROMPT_TEMPLATE(userPayload) }],
      }),
    })

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text().catch(() => "")
      console.error("Anthropic error:", anthropicRes.status, detail.slice(0, 200))
      return jsonResponse({ error: "AI service error" }, 502, origin)
    }

    const aiData = await anthropicRes.json() as {
      content: Array<{ type: string; text?: string }>
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    const block = aiData.content.find((c) => c.type === "text")
    let rawText = block?.text?.trim() ?? ""
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    }

    const filtered = filterOutput(rawText)
    if (!filtered.safe) {
      return jsonResponse({ error: "AI output rejected" }, 502, origin)
    }

    let goals: any
    try {
      goals = JSON.parse(filtered.output)
    } catch {
      return jsonResponse({ error: "Invalid AI output" }, 502, origin)
    }

    // Hard validation — refuse anything unsafe
    const isInt = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v > 0
    if (!isInt(goals.kcal) || !isInt(goals.protein_g) || !isInt(goals.carbs_g) ||
        !isInt(goals.fat_g) || !isInt(goals.fiber_g) || !isInt(goals.water_ml)) {
      return jsonResponse({ error: "AI returned malformed goals" }, 502, origin)
    }
    // Sanity bounds
    if (goals.kcal < 800 || goals.kcal > 5000) {
      return jsonResponse({ error: "AI returned out-of-range kcal" }, 502, origin)
    }
    if (goals.protein_g < 30 || goals.protein_g > 400) {
      return jsonResponse({ error: "AI returned out-of-range protein" }, 502, origin)
    }

    // Normalize / clamp
    const finalGoals = {
      version: 1,
      kcal: Math.round(goals.kcal),
      protein_g: Math.round(goals.protein_g),
      carbs_g: Math.round(goals.carbs_g),
      fat_g: Math.round(goals.fat_g),
      fiber_g: Math.round(goals.fiber_g),
      water_ml: Math.round(goals.water_ml),
      rationale: typeof goals.rationale === "string" ? goals.rationale.slice(0, 500) : "",
      priority_micros: Array.isArray(goals.priority_micros) ? goals.priority_micros.slice(0, 4) : [],
      flags: Array.isArray(goals.flags) ? goals.flags.slice(0, 3) : [],
      habits: Array.isArray(goals.habits) ? goals.habits.slice(0, 3).map((h: unknown) => String(h).slice(0, 200)) : [],
    }

    // Persist via service role (bypasses the strict profiles UPDATE policy)
    const service = serviceClient()
    const { error: updateErr } = await service
      .from("profiles")
      .update({
        ai_daily_goals: finalGoals,
        ai_goals_generated_at: new Date().toISOString(),
        ai_goals_model: MODEL_ID,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateErr) {
      console.error("Failed to persist goals:", updateErr.message)
      return jsonResponse({ error: "Could not save goals" }, 500, origin)
    }

    const tokens = (aiData.usage?.input_tokens ?? 0) + (aiData.usage?.output_tokens ?? 0)
    await logUsage(service, { userId: user.id, tokens, edgeFunction: FUNCTION_NAME })

    console.log(`ai-personalize-goals ok user=${user.id.slice(0, 8)} tokens=${tokens}`)

    return jsonResponse(
      { ok: true, cached: false, goals: finalGoals, model: MODEL_ID },
      200,
      origin,
    )
  } catch (err) {
    console.error(`${FUNCTION_NAME} unexpected error:`, (err as Error).message)
    return jsonResponse({ error: "Internal server error" }, 500, origin)
  }
})
