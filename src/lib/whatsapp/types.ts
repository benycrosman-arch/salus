export interface DailyGoals {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  water_ml: number
  rationale?: string
  flags?: string[]
  habits?: string[]
}

export interface MealLog {
  id: string
  meal_type: string
  score: number | null
  score_band: string | null
  macros: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  } | null
  logged_at: string
  user_notes?: string | null
}

export interface DailyTotals {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  meals_count: number
  avg_score: number | null
}

export interface DailyDelta {
  protein_remaining_g: number
  fiber_remaining_g: number
  water_remaining_ml: number
  kcal_remaining: number
}

export interface StreakInfo {
  current: number
  longest: number
  last_logged_date: string | null
}

export interface UserContext {
  userId: string
  name: string
  locale: 'pt' | 'en'
  timezone: string
  goals: DailyGoals | null
  todayMeals: MealLog[]
  todayTotals: DailyTotals
  delta: DailyDelta
  streak: StreakInfo
  preferences: {
    diet_type: string | null
    allergies: string[]
    goals: string[]
  }
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>
  localTimeISO: string
  localHour: number
  mealWindow: MealWindow
}

export type MealWindow =
  | 'pre_breakfast'
  | 'breakfast'
  | 'mid_morning'
  | 'pre_lunch'
  | 'lunch'
  | 'afternoon'
  | 'pre_dinner'
  | 'dinner'
  | 'evening'
  | 'overnight'

export interface WhatsAppConnection {
  user_id: string
  phone_e164: string
  chatwoot_contact_id: number | null
  chatwoot_conversation_id: number | null
  status: 'pending' | 'verified' | 'disabled'
  timezone: string
  nudge_lunch_enabled: boolean
  nudge_dinner_enabled: boolean
  nudge_recap_enabled: boolean
  last_message_at: string | null
  last_nudge_lunch_at: string | null
  last_nudge_dinner_at: string | null
  last_nudge_recap_at: string | null
}
