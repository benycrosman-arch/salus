import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

/**
 * Reads user goals + recent meals to inject into the system prompt.
 * Tightly scoped — five most recent meals only — so token usage stays bounded.
 */
export async function buildNutritionContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const [profileRes, prefsRes, mealsRes] = await Promise.all([
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
  ])

  const profile = profileRes.data
  const prefs = prefsRes.data
  const meals = mealsRes.data ?? []

  if (!profile && !prefs && meals.length === 0) return ""

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

  return lines.join("\n")
}
