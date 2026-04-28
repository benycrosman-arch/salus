-- ═══════════════════════════════════════════════════════════════
-- AI-PERSONALIZED GOALS — Sonnet 4.6 generates after onboarding
-- Stored as a single jsonb so we can iterate the schema without DDL.
-- ═══════════════════════════════════════════════════════════════

alter table profiles
  add column if not exists ai_daily_goals jsonb,
  add column if not exists ai_goals_generated_at timestamptz,
  add column if not exists ai_goals_model text;

-- Expected jsonb shape (versioned):
-- {
--   "version": 1,
--   "kcal": 2100,
--   "protein_g": 140,
--   "carbs_g": 210,
--   "fat_g": 70,
--   "fiber_g": 30,
--   "water_ml": 2500,
--   "rationale": "1-2 sentence explanation in pt-BR",
--   "priority_micros": ["iron_mg", "vit_d_mcg", ...],
--   "flags": ["high_protein_focus", "low_glycemic"],
--   "habits": ["string", "string", "string"]
-- }

-- Index for queries that filter by who has personalized goals
create index if not exists idx_profiles_ai_goals_generated
  on profiles(ai_goals_generated_at) where ai_goals_generated_at is not null;
