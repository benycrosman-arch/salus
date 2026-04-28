-- ═══════════════════════════════════════════════════════════════
-- FOOD DATABASE — canonical foods + aliases + servings
-- Sources to seed: TACO (Brazilian gov), OpenFoodFacts BR, USDA FDC.
-- Powers: text search, barcode lookup, AI image-recognition grounding (RAG).
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "pg_trgm" with schema extensions;   -- fuzzy text search
create extension if not exists "unaccent" with schema extensions;  -- accent-insensitive Portuguese
create extension if not exists "vector" with schema extensions;    -- pgvector for semantic search

-- Postgres can't index expressions that call STABLE functions; the stock
-- `unaccent()` is STABLE because it reads its dictionary at call time.
-- Wrap it in an IMMUTABLE function so trigram indexes can be built on top.
create or replace function public.f_unaccent(text)
returns text language sql immutable parallel safe as $$
  select extensions.unaccent($1)
$$;

-- ─── CANONICAL FOOD ───────────────────────────────────────────

create table if not exists foods (
  id uuid primary key default gen_random_uuid(),

  -- Identification
  name text not null,                          -- canonical Portuguese name (e.g. "Arroz, integral, cozido")
  name_en text,                                -- optional English name
  brand text,                                  -- null for generic foods
  barcode text,                                -- EAN-13/UPC-A (null if not a packaged product)
  source text not null check (source in ('taco', 'openfoodfacts', 'usda', 'user', 'ai')),
  source_id text,                              -- external id from the source DB
  category text,                               -- e.g. "cereal", "protein", "fruit"

  -- Per-100g nutrition (canonical reference — all servings derive from this)
  kcal_per_100g numeric not null check (kcal_per_100g >= 0),
  protein_g_per_100g numeric not null default 0 check (protein_g_per_100g >= 0),
  carbs_g_per_100g numeric not null default 0 check (carbs_g_per_100g >= 0),
  fat_g_per_100g numeric not null default 0 check (fat_g_per_100g >= 0),
  fiber_g_per_100g numeric not null default 0 check (fiber_g_per_100g >= 0),
  sugar_g_per_100g numeric default 0 check (sugar_g_per_100g >= 0),
  sodium_mg_per_100g numeric default 0 check (sodium_mg_per_100g >= 0),

  -- Micronutrients (per 100g, jsonb for flexibility — keys are ISO short codes)
  -- Example: { "vit_a_mcg": 12, "vit_c_mg": 8, "iron_mg": 1.2, "calcium_mg": 18 }
  micronutrients jsonb default '{}'::jsonb,

  -- Quality + popularity signals (used by ranker)
  data_quality smallint not null default 50 check (data_quality between 0 and 100),
  log_count integer not null default 0,        -- denormalized — bumped by trigger on meals.foods_detected
  is_verified boolean not null default false,  -- true for TACO/USDA/manually-curated

  -- Semantic embedding (1536 dims = OpenAI text-embedding-3-small / Cohere multilingual)
  -- Computed offline by the seed scripts
  embedding vector(1536),

  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null  -- null for canonical, user.id for user-added
);

-- Source uniqueness (e.g. don't insert TACO id 123 twice)
create unique index if not exists idx_foods_source_id on foods(source, source_id) where source_id is not null;

-- Barcode lookup (fast exact match)
create unique index if not exists idx_foods_barcode on foods(barcode) where barcode is not null;

-- Trigram fuzzy search (handles typos, partial matches in pt-BR)
create index if not exists idx_foods_name_trgm on foods using gin (public.f_unaccent(lower(name)) gin_trgm_ops);
create index if not exists idx_foods_brand_trgm on foods using gin (public.f_unaccent(lower(coalesce(brand, ''))) gin_trgm_ops);

-- Semantic similarity (IVFFlat — needs ANALYZE after seeding for good lists count)
create index if not exists idx_foods_embedding on foods using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Ranker
create index if not exists idx_foods_ranker on foods (is_verified desc, log_count desc, data_quality desc);

-- ─── FOOD ALIASES (synonyms, regional names, user typos) ──────

create table if not exists food_aliases (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references foods(id) on delete cascade,
  alias text not null,                          -- "feijão preto cozido", "black beans cooked"
  language text not null default 'pt-BR',
  created_at timestamptz not null default now()
);

create index if not exists idx_food_aliases_food on food_aliases(food_id);
create index if not exists idx_food_aliases_alias_trgm on food_aliases using gin (public.f_unaccent(lower(alias)) gin_trgm_ops);

-- ─── COMMON SERVING SIZES ─────────────────────────────────────
-- Each food can have multiple human-friendly portions. Conversion to grams.

create table if not exists food_servings (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references foods(id) on delete cascade,
  unit text not null,                           -- "porção", "fatia", "colher de sopa", "xícara", "g", "ml", "unidade"
  unit_label_pt text,                           -- pretty label for UI
  grams numeric not null check (grams > 0),     -- weight in grams
  is_default boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_food_servings_food on food_servings(food_id);

-- ─── USER-CREATED FOODS (separate table, different RLS) ───────

create table if not exists user_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  barcode text,
  kcal_per_100g numeric not null check (kcal_per_100g >= 0),
  protein_g_per_100g numeric not null default 0,
  carbs_g_per_100g numeric not null default 0,
  fat_g_per_100g numeric not null default 0,
  fiber_g_per_100g numeric not null default 0,
  micronutrients jsonb default '{}'::jsonb,
  servings jsonb default '[]'::jsonb,  -- inline servings instead of a join
  is_public boolean default false,     -- promote to canonical via admin review
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_foods_user on user_foods(user_id);
create index if not exists idx_user_foods_barcode on user_foods(barcode) where barcode is not null;
create index if not exists idx_user_foods_name_trgm on user_foods using gin (public.f_unaccent(lower(name)) gin_trgm_ops);

-- ─── FOOD LOG REFERENCES (link a meal item to its canonical food) ─
-- Backwards compatible — existing meals.foods_detected jsonb still works,
-- new logs can additionally cite the food_id for accuracy tracking.

alter table meals add column if not exists food_refs jsonb default '[]'::jsonb;
-- Shape: [{ "food_id": "...", "name_resolved": "...", "grams": 120, "servings": 1.5 }]

-- ─── ROW-LEVEL SECURITY ───────────────────────────────────────

alter table foods enable row level security;
alter table food_aliases enable row level security;
alter table food_servings enable row level security;
alter table user_foods enable row level security;

-- Canonical foods: public read, service role write
drop policy if exists "foods_public_read" on foods;
create policy "foods_public_read" on foods
  for select using (true);

drop policy if exists "foods_block_client_write" on foods;
create policy "foods_block_client_write" on foods
  for all using (false) with check (false);

drop policy if exists "food_aliases_public_read" on food_aliases;
create policy "food_aliases_public_read" on food_aliases
  for select using (true);
drop policy if exists "food_aliases_block_client_write" on food_aliases;
create policy "food_aliases_block_client_write" on food_aliases
  for all using (false) with check (false);

drop policy if exists "food_servings_public_read" on food_servings;
create policy "food_servings_public_read" on food_servings
  for select using (true);
drop policy if exists "food_servings_block_client_write" on food_servings;
create policy "food_servings_block_client_write" on food_servings
  for all using (false) with check (false);

-- User foods: owner CRUD, public read for is_public=true
drop policy if exists "user_foods_owner_crud" on user_foods;
create policy "user_foods_owner_crud" on user_foods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_foods_public_read" on user_foods;
create policy "user_foods_public_read" on user_foods
  for select using (is_public = true);

-- ─── HYBRID SEARCH RPC ────────────────────────────────────────
-- Combines barcode exact match → trigram fuzzy → vector similarity.
-- Used by the food-search Edge Function (Phase 2) to rank candidates.

create or replace function search_foods(
  p_query text,
  p_query_embedding vector(1536) default null,
  p_barcode text default null,
  p_limit integer default 20
) returns table (
  id uuid,
  name text,
  brand text,
  source text,
  category text,
  kcal_per_100g numeric,
  protein_g_per_100g numeric,
  carbs_g_per_100g numeric,
  fat_g_per_100g numeric,
  fiber_g_per_100g numeric,
  micronutrients jsonb,
  match_score numeric,    -- composite 0..1
  match_reason text       -- 'barcode' | 'fuzzy' | 'semantic' | 'alias'
)
language plpgsql
stable
as $$
declare
  v_query_norm text := public.f_unaccent(lower(coalesce(p_query, '')));
begin
  -- 1. Barcode exact match — always wins
  if p_barcode is not null and length(p_barcode) >= 8 then
    return query
    select f.id, f.name, f.brand, f.source, f.category,
           f.kcal_per_100g, f.protein_g_per_100g, f.carbs_g_per_100g,
           f.fat_g_per_100g, f.fiber_g_per_100g, f.micronutrients,
           1.0::numeric, 'barcode'::text
    from foods f
    where f.barcode = p_barcode
    limit 1;
    return;
  end if;

  -- 2. Hybrid trigram + alias + vector
  return query
  with fuzzy as (
    select f.id, f.name, f.brand, f.source, f.category,
           f.kcal_per_100g, f.protein_g_per_100g, f.carbs_g_per_100g,
           f.fat_g_per_100g, f.fiber_g_per_100g, f.micronutrients,
           greatest(
             similarity(public.f_unaccent(lower(f.name)), v_query_norm),
             similarity(public.f_unaccent(lower(coalesce(f.brand, ''))), v_query_norm)
           ) as fuzzy_score,
           f.is_verified, f.log_count, f.data_quality, f.embedding
    from foods f
    where public.f_unaccent(lower(f.name)) % v_query_norm
       or public.f_unaccent(lower(coalesce(f.brand, ''))) % v_query_norm
  ),
  alias_matches as (
    select f.id, f.name, f.brand, f.source, f.category,
           f.kcal_per_100g, f.protein_g_per_100g, f.carbs_g_per_100g,
           f.fat_g_per_100g, f.fiber_g_per_100g, f.micronutrients,
           similarity(public.f_unaccent(lower(a.alias)), v_query_norm) as fuzzy_score,
           f.is_verified, f.log_count, f.data_quality, f.embedding
    from food_aliases a
    join foods f on f.id = a.food_id
    where public.f_unaccent(lower(a.alias)) % v_query_norm
  ),
  combined as (
    select * from fuzzy
    union all
    select * from alias_matches
  ),
  scored as (
    select c.*,
           -- Composite score: 60% fuzzy, 30% verified+quality, 10% popularity
           (
             c.fuzzy_score * 0.6
             + (case when c.is_verified then 0.2 else 0.0 end)
             + (c.data_quality::numeric / 100.0) * 0.1
             + (least(c.log_count, 1000)::numeric / 1000.0) * 0.1
           ) as composite_score,
           -- Vector cosine similarity (when embedding provided)
           case
             when p_query_embedding is not null and c.embedding is not null
             then 1 - (c.embedding <=> p_query_embedding)
             else null
           end as vector_score
    from combined c
  )
  select s.id, s.name, s.brand, s.source, s.category,
         s.kcal_per_100g, s.protein_g_per_100g, s.carbs_g_per_100g,
         s.fat_g_per_100g, s.fiber_g_per_100g, s.micronutrients,
         -- Final score: blend fuzzy composite + vector when available
         (case
            when s.vector_score is not null
            then (s.composite_score * 0.6 + s.vector_score * 0.4)
            else s.composite_score
          end)::numeric as match_score,
         (case
            when s.vector_score is not null and s.vector_score > s.fuzzy_score
            then 'semantic'
            else 'fuzzy'
          end)::text as match_reason
  from scored s
  order by match_score desc
  limit p_limit;
end;
$$;

-- Allow authenticated users to call the search
grant execute on function search_foods(text, vector, text, integer) to authenticated, anon, service_role;

-- ─── LOG COUNT TRIGGER ────────────────────────────────────────
-- When a meal logs a food, bump the canonical log_count for ranking.

create or replace function bump_food_log_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ref jsonb;
  fid uuid;
begin
  if new.food_refs is null or jsonb_array_length(new.food_refs) = 0 then
    return new;
  end if;
  for ref in select * from jsonb_array_elements(new.food_refs)
  loop
    fid := nullif(ref->>'food_id', '')::uuid;
    if fid is not null then
      update foods set log_count = log_count + 1 where id = fid;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_bump_food_log_count on meals;
create trigger trg_bump_food_log_count
  after insert on meals
  for each row execute function bump_food_log_count();

-- ─── REVOKE ANON WHERE INAPPROPRIATE ──────────────────────────

revoke insert, update, delete on foods from anon, authenticated;
revoke insert, update, delete on food_aliases from anon, authenticated;
revoke insert, update, delete on food_servings from anon, authenticated;
