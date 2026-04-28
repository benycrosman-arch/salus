/**
 * Micronutrient reference values for adults.
 * Sources: IOM DRI tables (US/CA), aligned with ANVISA/Brazilian reference where applicable.
 * Used to compute "% of daily target" badges in the UI.
 */

export type Micronutrient = {
  key: string
  label: string
  unit: string
  rda: number      // Recommended Daily Allowance (adult, conservative average)
  upperLimit?: number
  category: "vitamin" | "mineral" | "macro"
}

export const MICRONUTRIENTS: Micronutrient[] = [
  // Vitamins
  { key: "vit_a_mcg", label: "Vitamina A", unit: "µg", rda: 800, upperLimit: 3000, category: "vitamin" },
  { key: "vit_c_mg", label: "Vitamina C", unit: "mg", rda: 90, upperLimit: 2000, category: "vitamin" },
  { key: "vit_d_mcg", label: "Vitamina D", unit: "µg", rda: 15, upperLimit: 100, category: "vitamin" },
  { key: "vit_e_mg", label: "Vitamina E", unit: "mg", rda: 15, upperLimit: 1000, category: "vitamin" },
  { key: "vit_k_mcg", label: "Vitamina K", unit: "µg", rda: 90, category: "vitamin" },
  { key: "thiamin_mg", label: "Tiamina (B1)", unit: "mg", rda: 1.2, category: "vitamin" },
  { key: "riboflavin_mg", label: "Riboflavina (B2)", unit: "mg", rda: 1.3, category: "vitamin" },
  { key: "niacin_mg", label: "Niacina (B3)", unit: "mg", rda: 16, upperLimit: 35, category: "vitamin" },
  { key: "vit_b6_mg", label: "Vitamina B6", unit: "mg", rda: 1.7, upperLimit: 100, category: "vitamin" },
  { key: "folate_mcg", label: "Folato", unit: "µg", rda: 400, upperLimit: 1000, category: "vitamin" },
  { key: "vit_b12_mcg", label: "Vitamina B12", unit: "µg", rda: 2.4, category: "vitamin" },

  // Minerals
  { key: "calcium_mg", label: "Cálcio", unit: "mg", rda: 1000, upperLimit: 2500, category: "mineral" },
  { key: "iron_mg", label: "Ferro", unit: "mg", rda: 14, upperLimit: 45, category: "mineral" },
  { key: "magnesium_mg", label: "Magnésio", unit: "mg", rda: 400, category: "mineral" },
  { key: "phosphorus_mg", label: "Fósforo", unit: "mg", rda: 700, upperLimit: 4000, category: "mineral" },
  { key: "potassium_mg", label: "Potássio", unit: "mg", rda: 3500, category: "mineral" },
  { key: "zinc_mg", label: "Zinco", unit: "mg", rda: 11, upperLimit: 40, category: "mineral" },
  { key: "copper_mg", label: "Cobre", unit: "mg", rda: 0.9, upperLimit: 10, category: "mineral" },
  { key: "manganese_mg", label: "Manganês", unit: "mg", rda: 2.3, upperLimit: 11, category: "mineral" },
  { key: "selenium_mcg", label: "Selênio", unit: "µg", rda: 55, upperLimit: 400, category: "mineral" },
  { key: "sodium_mg", label: "Sódio", unit: "mg", rda: 2000, upperLimit: 2300, category: "mineral" },
]

export const MICRO_BY_KEY: Record<string, Micronutrient> = Object.fromEntries(
  MICRONUTRIENTS.map((m) => [m.key, m]),
)

export type MicroStatus = "low" | "ok" | "high" | "over"

export function microStatus(key: string, value: number): MicroStatus {
  const def = MICRO_BY_KEY[key]
  if (!def) return "ok"
  const pct = value / def.rda
  if (def.upperLimit && value >= def.upperLimit) return "over"
  if (pct < 0.5) return "low"
  if (pct >= 1.5) return "high"
  return "ok"
}

export function microPercent(key: string, value: number): number {
  const def = MICRO_BY_KEY[key]
  if (!def) return 0
  return Math.min(200, Math.round((value / def.rda) * 100))
}
