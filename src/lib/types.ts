// Core types for NutriGen

export type CalorieBias = 'conservative' | 'balanced' | 'generous'

export interface ParsedFoodItem {
  id: string
  raw_phrase: string
  name_resolved: string
  qty: number
  unit: string
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  confidence: number
  reasoning: string
  source: 'usda' | 'branded' | 'estimate'
}

export interface TextLogResult {
  items: ParsedFoodItem[]
  totals: {
    kcal: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
}

export interface FoodItem {
  name: string
  quantity: string
  unit: string
  estimatedCalories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  isProcessed: boolean
  confidence?: 'high' | 'medium' | 'low'
  cookingMethod?: string
  visualReasoning?: string
  alternative?: string | null
}

export interface MealMacros {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
}

export interface MealAnalysis {
  foods: FoodItem[]
  totalMacros: MealMacros
  fiberDiversityCount: number
  glycemicImpact: 'low' | 'medium' | 'high'
  processedFoodRatio: number
  mealScore: number
  feedback: string
  swapSuggestions?: string[]
  photoQualityIssue?: boolean
  correctionPrompt?: string | null
}

export interface DailyScoreData {
  date: string
  score: number
  fiberDiversity: number
  sugarLoad: number
  mealsLogged: number
  caloriesTotal: number
}

export interface RecommendationData {
  id: string
  type: 'food_swap' | 'daily_challenge' | 'supplement' | 'meal_suggestion'
  content: string
  priority: number
  dismissed: boolean
}

export interface StreakData {
  currentStreak: number
  longestStreak: number
  lastLogDate: string | null
}

export interface MealRecord {
  id: string
  imageUrl: string | null
  foodsDetected: FoodItem[]
  macros: MealMacros
  fiberDiversityScore: number
  glycemicImpact: 'low' | 'medium' | 'high'
  processedFoodRatio: number
  score: number
  feedback: string
  loggedAt: string
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  age: number | null
  sex: string | null
  weight: number | null
  height: number | null
  activityLevel: string | null
  goals: string[]
  dietType: string | null
  allergies: string[]
  dislikedFoods: string | null
  subscriptionStatus: 'free' | 'premium' | 'cancelled'
  onboardingComplete: boolean
}

export interface OnboardingData {
  // Step 1
  age?: number
  sex?: string
  height?: number
  weight?: number
  activityLevel?: string
  // Step 2
  goals?: string[]
  // Step 3
  dietType?: string
  allergies?: string[]
  // Step 4
  hba1c?: number
  totalCholesterol?: number
  hdl?: number
  ldl?: number
  vitaminD?: number
  ferritin?: number
  b12?: number
  // Step 5 - gut health questionnaire
  bowelRegularity?: number
  bloatingFrequency?: number
  energyAfterMeals?: number
  antibioticHistory?: boolean
  fermentedFoodConsumption?: number
  plantDiversity?: number
  digestiveComfort?: number
  stoolConsistency?: number
}

export interface GroceryItem {
  name: string
  quantity: string
  category: 'produce' | 'protein' | 'pantry' | 'dairy' | 'snacks'
  estimatedPrice: number
  owned: boolean
}

export interface MealPlanDay {
  day: string
  meals: {
    breakfast: string
    snack1: string
    lunch: string
    snack2: string
    dinner: string
  }
}
