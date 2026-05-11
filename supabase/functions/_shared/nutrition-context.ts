import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const MAX_ATTACHMENT_CHARS_EACH = 2500
const MAX_ATTACHMENT_CHARS_TOTAL = 6000

interface NutriGuidance {
  active: string | null
  attachments: { kind: string; filename: string | null; text: string }[]
}

async function loadNutriGuidance(
  supabase: SupabaseClient,
  userId: string,
): Promise<NutriGuidance> {
  try {
    const [recRes, attRes] = await Promise.all([
      supabase
        .from("nutri_recommendations")
        .select("body")
        .eq("patient_id", userId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("nutri_patient_attachments")
        .select("kind, original_filename, extracted_text")
        .eq("patient_id", userId)
        .not("extracted_text", "is", null)
        .order("created_at", { ascending: false })
        .limit(10),
    ])

    const active = (recRes.data?.body as string | undefined)?.trim() || null
    const attachments: NutriGuidance["attachments"] = []
    let budget = MAX_ATTACHMENT_CHARS_TOTAL
    for (const row of attRes.data ?? []) {
      if (budget <= 0) break
      const raw = (row.extracted_text as string | null) ?? ""
      if (!raw) continue
      const slice = raw.slice(0, Math.min(MAX_ATTACHMENT_CHARS_EACH, budget))
      budget -= slice.length
      attachments.push({
        kind: (row.kind as string | null) ?? "other",
        filename: (row.original_filename as string | null) ?? null,
        text: slice,
      })
    }
    return { active, attachments }
  } catch {
    return { active: null, attachments: [] }
  }
}

/**
 * Reads user goals + recent meals to inject into the system prompt.
 * Tightly scoped — five most recent meals only — so token usage stays bounded.
 */
export async function buildNutritionContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const [profileRes, prefsRes, mealsRes, nutriGuidance] = await Promise.all([
    supabase
      .from("profiles")
      .select("age, biological_sex, height_cm, weight_kg, activity_level")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select("goals, diet_type, allergies")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("meals")
      .select("foods_detected, macros, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    loadNutriGuidance(supabase, userId),
  ])

  const profile = profileRes.data
  const prefs = prefsRes.data
  const meals = mealsRes.data ?? []
  const hasNutri = nutriGuidance.active || nutriGuidance.attachments.length > 0

  if (!profile && !prefs && meals.length === 0 && !hasNutri) return ""

  const lines: string[] = ["", "## USER CONTEXT (read-only background)"]

  if (profile) {
    const parts: string[] = []
    if (profile.age) parts.push(`age ${profile.age}`)
    if (profile.biological_sex) parts.push(`sex ${profile.biological_sex}`)
    if (profile.height_cm) parts.push(`${profile.height_cm}cm`)
    if (profile.weight_kg) parts.push(`${profile.weight_kg}kg`)
    if (profile.activity_level) parts.push(`activity ${profile.activity_level}`)
    if (parts.length) lines.push(`Profile: ${parts.join(", ")}`)
  }

  if (prefs) {
    const parts: string[] = []
    if (prefs.diet_type) parts.push(`diet ${prefs.diet_type}`)
    if (Array.isArray(prefs.goals) && prefs.goals.length) parts.push(`goals ${prefs.goals.join("/")}`)
    if (Array.isArray(prefs.allergies) && prefs.allergies.length) parts.push(`allergies ${prefs.allergies.join(", ")}`)
    if (parts.length) lines.push(`Preferences: ${parts.join("; ")}`)
  }

  if (meals.length > 0) {
    const summary = meals
      .map((m) => {
        const cals = (m.macros as { calories?: number } | null)?.calories
        const foods = Array.isArray(m.foods_detected)
          ? m.foods_detected
              .map((f: { name?: string }) => f?.name)
              .filter(Boolean)
              .slice(0, 3)
              .join(" + ")
          : ""
        return foods ? `${foods}${cals ? ` (${Math.round(cals)} kcal)` : ""}` : null
      })
      .filter(Boolean)
      .join(" | ")
    if (summary) lines.push(`Recent meals: ${summary}`)
  }

  if (hasNutri) {
    lines.push("")
    lines.push("## NUTRICIONISTA — orientação ativa (TRATAR COMO PRIORIDADE)")
    if (nutriGuidance.active) lines.push(nutriGuidance.active)
    if (nutriGuidance.attachments.length > 0) {
      lines.push("")
      lines.push("## NUTRICIONISTA — material entregue (conteúdo dos PDFs)")
      for (const att of nutriGuidance.attachments) {
        const label = [att.kind, att.filename].filter(Boolean).join(" / ")
        lines.push(`--- ${label} ---`)
        lines.push(att.text)
      }
    }
  }

  return lines.join("\n")
}
