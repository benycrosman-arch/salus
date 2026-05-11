/**
 * Daily nutrition goals — evidence-based.
 *
 * Calories use Mifflin–St Jeor (1990, JADA) with ACSM/AND activity multipliers,
 * blended with measured active calories from wearables when available.
 *
 * Protein is computed g/kg-FIRST because every major sports-nutrition society
 * frames the recommendation in g/kg, not as a % of kcal:
 *
 *   - Morton et al. 2018 (Br J Sports Med, n=49 RCT meta-analysis):
 *       1.6 g/kg/day is the breakpoint for additional muscle protein synthesis
 *       with resistance training. Upper 95 % CI = 2.2 g/kg/day.
 *   - Jäger et al. 2017, ISSN Position Stand on Protein and Exercise:
 *       1.4–2.0 g/kg/day for active adults; 2.3–3.1 g/kg of fat-free mass for
 *       lean athletes during energy restriction.
 *   - Thomas/Erdman/Burke 2016, Joint Position of ACSM / AND /
 *       Dietitians of Canada (Med Sci Sports Exerc): 1.2–2.0 g/kg/day for
 *       athletes, with timing every 3–4 h.
 *   - Helms et al. 2014 (J Int Soc Sports Nutr) and Longland et al. 2016
 *       (Am J Clin Nutr): 1.8–2.4 g/kg/day in a deficit preserves lean mass;
 *       Longland's 2.4 g/kg arm built more muscle than the 1.2 g/kg arm during
 *       a 40 % deficit.
 *   - Bauer et al. 2013, PROT-AGE Study Group (JAMDA) and ESPEN expert
 *       consensus: ≥1.0–1.2 g/kg/day for healthy older adults to combat
 *       sarcopenia; 1.2–1.5 g/kg if acutely or chronically ill.
 *   - Phillips & Van Loon 2011 (J Sports Sci): 1.3–1.8 g/kg/day for general
 *       active adults across endurance and strength training.
 *   - Antonio et al. 2014–2016 (J Int Soc Sports Nutr): up to 3.4 g/kg/day
 *       showed no adverse renal/lipid effects in trained subjects — informs
 *       the upper safety bound, not the target.
 *
 * Fat: minimum 0.6 g/kg AND ≥20 % of kcal — preserves endocrine function
 *   (Volek & Forsythe 2007; ISSN 2017). Keto override raises fat to remainder.
 *
 * Fiber: 14 g per 1000 kcal (US/Brazilian DRI), floored at 25 g and capped at
 *   40 g. Reynolds et al. 2019 (Lancet meta-analysis, 185 prospective studies,
 *   58 RCTs): 25–29 g/day reduces all-cause and cardiovascular mortality.
 *   "gut-health" goal raises the floor to 35 g (American Gut Project; Sonnenburg
 *   & Sonnenburg 2014, Cell Metab).
 *
 * Hydration: 35 ml/kg baseline (EFSA 2010 Adequate Intake derivation;
 *   IOM/NAM 2005 DRI Water & Electrolytes — 2.7 L women, 3.7 L men total
 *   water from food + drinks, ~80 % from beverages). Adds 12 ml/kg per hour
 *   of exercise above ~30 min and ~13 ml per kcal of measured active burn
 *   (Sawka et al. 2007 ACSM Position Stand on Exercise & Fluid Replacement;
 *   Maughan & Shirreffs 2010). Older adults floor at 1.6 L (women) / 2.0 L
 *   (men) — thirst response declines with age (Kenney & Chiu 2001 Am J Clin
 *   Nutr; Volkert et al. 2019 ESPEN guideline on hydration in geriatrics).
 *
 * Calorie floors follow Trexler/Smith-Ryan/Norton 2014 (J Int Soc Sports Nutr)
 *   and Helms et al. 2014: never below BMR × 1.1, with a hard floor of
 *   1500 kcal (men) / 1200 kcal (women) to avoid metabolic adaptation.
 */

export interface UserGoalProfile {
  age: number
  biological_sex: 'male' | 'female' | 'other'
  height_cm: number
  weight_kg: number
  activity_level: 'sedentary' | 'moderate' | 'active' | 'athlete'
  goals: string[]
  diet_type?: 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'keto' | 'paleo'
  hba1c?: number
  glucose?: number
  wearable?: {
    active_calories_kcal?: number
    exercise_minutes?: number
    sleep_hours?: number
  }
}

export interface DailyGoals {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  water_ml: number
  protein_per_kg: number
  rationale: string
  sources: string[]
}

// Harris-Benedict / Mifflin-St Jeor activity factors; mapping reflects the
// onboarding labels (Portuguese "moderado/ativo/atleta").
const ACTIVITY_MULTIPLIER: Record<UserGoalProfile['activity_level'], number> = {
  sedentary: 1.2,    // desk job, no structured exercise
  moderate: 1.375,   // light exercise 1–3 d/wk ("levemente ativo")
  active: 1.55,      // moderate exercise 4–5 d/wk ("moderadamente ativo")
  athlete: 1.725,    // hard exercise 6–7 d/wk or twice-daily training
}

function mifflinStJeor(p: UserGoalProfile): number {
  const base = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age
  return p.biological_sex === 'male' ? base + 5 : base - 161
}

// Returns the protein target in g/kg of body weight, applying the highest
// applicable floor across activity / goal / age / diet / wearable signals.
// Citations live in the docblock above.
function proteinTargetPerKg(p: UserGoalProfile): { value: number; reasons: string[] } {
  const reasons: string[] = []
  const candidates: Array<{ value: number; reason: string }> = []

  // Activity floor — Phillips & Van Loon 2011, ISSN 2017.
  const byActivity: Record<UserGoalProfile['activity_level'], number> = {
    sedentary: 1.0,
    moderate: 1.4,
    active: 1.6,
    athlete: 1.8,
  }
  candidates.push({
    value: byActivity[p.activity_level],
    reason: `nível de atividade (${p.activity_level})`,
  })

  // Goal floors.
  if (p.goals.includes('build-muscle')) {
    // Morton 2018 breakpoint + ISSN upper range.
    candidates.push({ value: 2.0, reason: 'ganho de massa (Morton 2018, ISSN)' })
  }
  if (p.goals.includes('lose-weight')) {
    // Helms 2014 / Longland 2016 — preserve lean mass in deficit.
    candidates.push({ value: 1.8, reason: 'preservação de massa magra em déficit (Helms 2014)' })
  }
  if (p.goals.includes('performance')) {
    candidates.push({ value: 1.8, reason: 'performance esportiva (ACSM/AND 2016)' })
  }

  // Age — PROT-AGE / ESPEN.
  if (p.age >= 65) {
    candidates.push({ value: 1.2, reason: 'idade ≥65 (PROT-AGE 2013)' })
  } else if (p.age >= 50) {
    candidates.push({ value: 1.1, reason: 'idade ≥50 (prevenção de sarcopenia)' })
  }

  // Plant-based — DIAAS is lower, so total intake needs to be higher.
  // Mariotti & Gardner 2019 (Nutrients); ISSN 2017 §10.
  if (p.diet_type === 'vegan') {
    candidates.push({ value: 1.6, reason: 'dieta vegana (DIAAS menor)' })
  } else if (p.diet_type === 'vegetarian') {
    candidates.push({ value: 1.4, reason: 'dieta vegetariana' })
  }

  // Wearable signals — high training load needs more substrate.
  // ISSN 2017; ACSM 2016 timing/quantity recommendations.
  const exerciseMin = p.wearable?.exercise_minutes
  const activeKcal = p.wearable?.active_calories_kcal
  if ((exerciseMin !== undefined && exerciseMin >= 60) ||
      (activeKcal !== undefined && activeKcal >= 600)) {
    candidates.push({ value: 2.0, reason: 'alta carga de treino medida no wearable' })
  } else if ((exerciseMin !== undefined && exerciseMin >= 45) ||
             (activeKcal !== undefined && activeKcal >= 450)) {
    candidates.push({ value: 1.8, reason: 'carga de treino moderada-alta medida no wearable' })
  }

  // Pick the highest floor — the literature is "at least X g/kg".
  candidates.sort((a, b) => b.value - a.value)
  const winner = candidates[0]
  reasons.push(winner.reason)

  // Cap at 2.2 g/kg (Morton upper 95 % CI) for general use,
  // 2.4 g/kg (Longland) only when explicitly cutting AND building.
  const allowAggressive = p.goals.includes('lose-weight') &&
    (p.goals.includes('build-muscle') || p.activity_level === 'athlete')
  const cap = allowAggressive ? 2.4 : 2.2

  return { value: Math.min(winner.value, cap), reasons }
}

export function calculateGoals(p: UserGoalProfile): DailyGoals {
  const baseBmr = mifflinStJeor(p)
  const activityMultiplier = ACTIVITY_MULTIPLIER[p.activity_level] ?? 1.4
  const baselineTdee = baseBmr * activityMultiplier

  // Wearable blend — measured active kcal is a per-user correction.
  // Weighted 60/40 toward measured because activity questionnaires are
  // notoriously over-reported (Lichtman 1992 NEJM; Westerterp 2017).
  const wearableActive = p.wearable?.active_calories_kcal
  const baselineActive = Math.max(0, baselineTdee - baseBmr)
  const blendedActive =
    wearableActive !== undefined
      ? baselineActive * 0.4 + Math.max(0, wearableActive) * 0.6
      : baselineActive
  const tdee = Math.round(baseBmr + blendedActive)

  // Goal-driven kcal adjustment.
  // Helms 2014: 0.5–1 % BW/wk loss preserves lean mass; ~20 % deficit fits.
  // Aragon & Schoenfeld 2013 (J Int Soc Sports Nutr): "lean bulk" ≈ +10 %.
  let kcal = tdee
  const sleepHours = p.wearable?.sleep_hours
  const shortSleep = sleepHours !== undefined && sleepHours < 6.5

  if (p.goals.includes('lose-weight')) {
    // Short sleep raises cortisol and blunts fat loss (Nedeltcheva 2010 Ann Int Med);
    // gentler deficit improves adherence.
    const deficit = shortSleep ? 0.10 : 0.18
    kcal = Math.round(tdee * (1 - deficit))
  } else if (p.goals.includes('build-muscle')) {
    const surplus = shortSleep ? 0.07 : 0.12
    kcal = Math.round(tdee * (1 + surplus))
  } else if (p.goals.includes('more-energy') || p.goals.includes('longevity')) {
    kcal = Math.round(tdee * 1.02)
  }

  // Calorie floors — never below BMR × 1.1, with sex-specific hard floor
  // (Trexler 2014; Helms 2014).
  const sexFloor = p.biological_sex === 'male' ? 1500 : 1200
  kcal = Math.max(kcal, Math.round(baseBmr * 1.1), sexFloor)

  // ─── Protein ──────────────────────────────────────────────────────────────
  const protein = proteinTargetPerKg(p)
  let protein_g = Math.round(p.weight_kg * protein.value)

  // Soft cap so protein doesn't crowd out fat/carbs at low body weight.
  // Cap at 40 % of kcal for non-cutting; 45 % for explicit cuts.
  const proteinKcalCap = p.goals.includes('lose-weight') ? 0.45 : 0.40
  const proteinFromKcalCap = Math.floor((kcal * proteinKcalCap) / 4)
  protein_g = Math.min(protein_g, proteinFromKcalCap)

  // ─── Fat ──────────────────────────────────────────────────────────────────
  // Floor: max(0.6 g/kg, 20 % kcal). Keto: take the remainder of kcal.
  // Volek & Forsythe 2007; ISSN 2017.
  const minFatFromKg = Math.round(p.weight_kg * 0.6)
  const minFatFromPct = Math.round((kcal * 0.20) / 9)
  let fat_g = Math.max(minFatFromKg, minFatFromPct)

  // ─── Carbs ────────────────────────────────────────────────────────────────
  const proteinKcal = protein_g * 4
  const fatKcal = fat_g * 9
  let carbs_g = Math.max(0, Math.round((kcal - proteinKcal - fatKcal) / 4))

  // Goal/condition overrides for the carb/fat split.
  const highBloodSugar =
    p.goals.includes('blood-sugar') ||
    (p.hba1c !== undefined && p.hba1c > 5.7) ||
    (p.glucose !== undefined && p.glucose > 100)

  if (p.diet_type === 'keto') {
    // Volek & Phinney "Art and Science of Low Carbohydrate Performance".
    carbs_g = Math.min(carbs_g, 50)
    fat_g = Math.max(0, Math.round((kcal - proteinKcal - carbs_g * 4) / 9))
  } else if (highBloodSugar) {
    // ADA Standards of Care 2024; Diabetes UK low-carb position 2021.
    const carbsCap = Math.round((kcal * 0.30) / 4)
    if (carbs_g > carbsCap) {
      const moved = (carbs_g - carbsCap) * 4
      carbs_g = carbsCap
      fat_g += Math.round(moved / 9)
    }
  } else {
    // Carbohydrate floor — brain/glycogen needs ~120–150 g/day;
    // ACSM endurance recommendation pushes higher with training volume.
    // Burke et al. 2018 (Front Physiol).
    const carbFloorKg = (p.activity_level === 'active' || p.activity_level === 'athlete') ? 3 : 2
    const carbFloor = Math.max(120, Math.round(p.weight_kg * carbFloorKg))
    if (carbs_g < carbFloor && fat_g > minFatFromPct) {
      // Trade some fat back for carbs, but keep fat above its floor.
      const deficit_g = carbFloor - carbs_g
      const fatGiveBack = Math.min(fat_g - minFatFromPct, Math.round((deficit_g * 4) / 9))
      fat_g -= fatGiveBack
      carbs_g += Math.round((fatGiveBack * 9) / 4)
    }
  }

  // ─── Fiber ────────────────────────────────────────────────────────────────
  // Reynolds 2019 Lancet; Brazilian SBD 2024 guidance.
  let fiber_g = Math.round((kcal / 1000) * 14)
  if (p.goals.includes('gut-health')) fiber_g = Math.max(fiber_g, 35)
  if (highBloodSugar) fiber_g = Math.max(fiber_g, 30) // Reynolds 2020 PLoS Med
  if (shortSleep) fiber_g += 3
  fiber_g = Math.max(25, Math.min(40, fiber_g))

  // ─── Hydration ────────────────────────────────────────────────────────────
  // EFSA 2010 / IOM 2005 baseline ~35 ml/kg, plus exercise add-on per ACSM
  // 2007 Position Stand. Older adults blunted thirst → enforce a sex-specific
  // floor (Volkert/ESPEN 2019; Kenney & Chiu 2001).
  const hydrationExerciseMin = p.wearable?.exercise_minutes
  const hydrationActiveKcal = p.wearable?.active_calories_kcal
  let water_ml = Math.round(p.weight_kg * 35)
  if (hydrationExerciseMin !== undefined && hydrationExerciseMin > 30) {
    water_ml += Math.round(p.weight_kg * 12 * ((hydrationExerciseMin - 30) / 60))
  }
  if (hydrationActiveKcal !== undefined && hydrationActiveKcal > 0) {
    water_ml += Math.round(hydrationActiveKcal * 13)
  }
  if (p.diet_type === 'keto') {
    // Glycogen depletion → ~3 g water lost per gram of glycogen (Olsson &
    // Saltin 1970 Acta Physiol Scand). Phinney/Volek recommend ≥500 ml extra
    // plus electrolytes during adaptation.
    water_ml += 500
  }
  if (p.goals.includes('lose-weight')) {
    // Dennis et al. 2010 Obesity: 500 ml pre-meal water improved weight loss.
    water_ml += 500
  }
  if (p.age >= 65) {
    const elderlyFloor = p.biological_sex === 'male' ? 2000 : 1600
    water_ml = Math.max(water_ml, elderlyFloor)
  }
  // Hard floor — EFSA AI for total water from beverages.
  const beverageFloor = p.biological_sex === 'male' ? 2000 : 1500
  water_ml = Math.max(water_ml, beverageFloor)
  // Cap at 4 L to avoid hyponatremia risk in non-elite athletes
  // (Almond et al. 2005 NEJM, Boston Marathon hyponatremia study).
  water_ml = Math.min(water_ml, 4000)
  // Round to nearest 100 ml — the precision the literature actually supports.
  water_ml = Math.round(water_ml / 100) * 100

  // ─── Rationale (pt-BR) ────────────────────────────────────────────────────
  const proteinPerKg = Math.round((protein_g / p.weight_kg) * 10) / 10
  const rationaleParts: string[] = [
    `Calorias por Mifflin-St Jeor (${baseBmr.toFixed(0)} kcal de TMB) × atividade ${activityMultiplier}`,
  ]
  if (wearableActive !== undefined) {
    rationaleParts[0] += ` ajustado por ${Math.round(wearableActive)} kcal ativos médios do wearable`
  }
  rationaleParts.push(`Proteína ${proteinPerKg} g/kg: ${protein.reasons.join('; ')}`)
  if (p.goals.includes('lose-weight')) rationaleParts.push(`Déficit ${shortSleep ? '10%' : '18%'} para perda de peso`)
  if (p.goals.includes('build-muscle')) rationaleParts.push(`Superávit ${shortSleep ? '7%' : '12%'} para hipertrofia`)
  if (highBloodSugar) rationaleParts.push('Carboidratos limitados para controle glicêmico')
  if (p.diet_type === 'keto') rationaleParts.push('Carboidratos ≤50 g (cetogênica)')
  rationaleParts.push(`Hidratação ${(water_ml / 1000).toFixed(1)} L (35 ml/kg + exercício, EFSA 2010/ACSM 2007)`)

  return {
    kcal: Math.round(kcal),
    protein_g,
    carbs_g,
    fat_g,
    fiber_g,
    water_ml,
    protein_per_kg: proteinPerKg,
    rationale: rationaleParts.join('. ') + '.',
    sources: RESEARCH_SOURCES,
  }
}

// Top-tier sources backing the recommendations above. Kept short and stable
// so the dashboard / settings can surface them verbatim.
export const RESEARCH_SOURCES: string[] = [
  'Morton RW et al. 2018 — Br J Sports Med (meta-analysis, n=49 RCTs)',
  'Jäger R et al. 2017 — ISSN Position Stand: Protein and Exercise',
  'Thomas DT, Erdman KA, Burke LM 2016 — ACSM/AND/Dietitians of Canada Joint Position',
  'Helms ER et al. 2014 — J Int Soc Sports Nutr (cutting protocols)',
  'Longland TM et al. 2016 — Am J Clin Nutr (high-protein deficit RCT)',
  'Bauer J et al. 2013 — PROT-AGE Study Group, JAMDA',
  'Phillips SM, Van Loon LJC 2011 — J Sports Sci',
  'Mifflin MD et al. 1990 — J Am Diet Assoc (BMR equation)',
  'Reynolds A et al. 2019 — Lancet (fiber meta-analysis)',
  'Volek JS, Forsythe CE 2007 — Curr Sports Med Rep (fat & hormones)',
  'Trexler ET, Smith-Ryan AE, Norton LE 2014 — J Int Soc Sports Nutr (metabolic adaptation)',
  'Aragon AA, Schoenfeld BJ 2013 — J Int Soc Sports Nutr (nutrient timing)',
  'Nedeltcheva AV et al. 2010 — Ann Intern Med (sleep & fat loss)',
  'Burke LM et al. 2018 — Front Physiol (carbohydrate for athletes)',
  'ADA Standards of Care 2024 — Diabetes Care',
  'EFSA Panel on Dietetic Products 2010 — Scientific Opinion on Dietary Reference Values for Water',
  'Institute of Medicine 2005 — DRI for Water, Potassium, Sodium, Chloride, and Sulfate',
  'Sawka MN et al. 2007 — ACSM Position Stand: Exercise and Fluid Replacement (Med Sci Sports Exerc)',
  'Volkert D et al. 2019 — ESPEN guideline on clinical nutrition and hydration in geriatrics',
]
