-- ============================================================
-- Salus — Initial Schema
-- Run with: supabase db push  OR  paste in Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  role text not null default 'user' check (role in ('user','nutricionista','admin')),
  birth_date date,
  biological_sex text check (biological_sex in ('male','female','other')),
  height_cm integer,
  weight_kg numeric(5,2),
  city text,
  country text default 'BR',
  latitude numeric,
  longitude numeric,
  plan text default 'free' check (plan in ('free','pro','nutri_pro')),
  paddle_customer_id text,
  paddle_subscription_id text,
  leaderboard_optin boolean default false,
  onboarding_completed boolean default false,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- USER PREFERENCES
-- ============================================================
create table if not exists user_preferences (
  user_id uuid references profiles(id) on delete cascade primary key,
  goals text[] default '{}',
  diet_type text,
  allergies text[] default '{}',
  preferences text[] default '{}',
  gut_score integer,
  gut_questionnaire jsonb,
  updated_at timestamptz default now()
);

-- ============================================================
-- LAB RESULTS
-- ============================================================
create table if not exists lab_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  marker text not null,
  value numeric not null,
  unit text not null,
  reference_min numeric,
  reference_max numeric,
  measured_at date not null,
  source text default 'manual' check (source in ('manual','pdf_upload','test_kit')),
  created_at timestamptz default now()
);

create index if not exists idx_lab_results_user on lab_results(user_id, marker, measured_at desc);

-- ============================================================
-- MEALS
-- ============================================================
create table if not exists meals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  photo_url text,
  logged_at timestamptz default now(),
  meal_type text check (meal_type in ('breakfast','snack1','lunch','snack2','dinner','other')),
  foods_detected jsonb,
  macros jsonb,
  micros jsonb,
  score integer not null check (score >= 0 and score <= 100),
  score_band text check (score_band in ('excelente','otimo','bom','atencao','evitar')),
  ai_analysis jsonb,
  user_notes text,
  created_at timestamptz default now()
);

create index if not exists idx_meals_user_logged on meals(user_id, logged_at desc);

-- ============================================================
-- DAILY STATS
-- ============================================================
create table if not exists daily_stats (
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  avg_score integer,
  meals_count integer default 0,
  streak_day boolean default false,
  primary key (user_id, date)
);

-- ============================================================
-- STREAKS
-- ============================================================
create table if not exists streaks (
  user_id uuid references profiles(id) on delete cascade primary key,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_logged_date date
);

-- ============================================================
-- MEAL PLANS
-- ============================================================
create table if not exists meal_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  week_start date not null,
  plan jsonb not null,
  grocery_list jsonb,
  generated_by text default 'ai' check (generated_by in ('ai','nutricionista')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ============================================================
-- WEARABLES
-- ============================================================
create table if not exists device_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  provider text not null check (provider in ('apple_health','whoop','oura','garmin','fitbit','strava')),
  status text default 'pending' check (status in ('pending','connected','error','disconnected')),
  access_token_encrypted text,
  refresh_token_encrypted text,
  last_sync timestamptz,
  created_at timestamptz default now(),
  unique(user_id, provider)
);

create table if not exists wearable_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  provider text not null,
  metric text not null,
  value numeric,
  unit text,
  recorded_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_wearable_data_user on wearable_data(user_id, metric, recorded_at desc);

-- ============================================================
-- NUTRITIONIST RELATIONSHIPS
-- ============================================================
create table if not exists nutri_patient_links (
  id uuid default gen_random_uuid() primary key,
  nutri_id uuid references profiles(id) on delete cascade not null,
  patient_id uuid references profiles(id) on delete cascade not null,
  status text default 'active' check (status in ('pending','active','ended')),
  created_at timestamptz default now(),
  unique(nutri_id, patient_id)
);

create table if not exists nutri_invites (
  id uuid default gen_random_uuid() primary key,
  nutri_id uuid references profiles(id) on delete cascade not null,
  patient_email text not null,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  status text default 'pending' check (status in ('pending','accepted','expired')),
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

create table if not exists nutri_chats (
  id uuid default gen_random_uuid() primary key,
  nutri_id uuid references profiles(id) on delete cascade not null,
  patient_id uuid references profiles(id) on delete cascade not null,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_nutri_chats on nutri_chats(nutri_id, patient_id, created_at);

create table if not exists nutri_settings (
  nutri_id uuid references profiles(id) on delete cascade primary key,
  digest_mode text default 'brief' check (digest_mode in ('brief','detailed','alerts_only')),
  digest_hour integer default 8 check (digest_hour >= 0 and digest_hour <= 23),
  updated_at timestamptz default now()
);

-- ============================================================
-- NUDGES
-- ============================================================
create table if not exists nudges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  category text,
  shown_at timestamptz default now(),
  dismissed boolean default false,
  acted_on boolean default false
);

-- ============================================================
-- LEADERBOARD (materialized view — refresh daily via cron)
-- ============================================================
create materialized view if not exists leaderboard as
select
  p.id,
  p.name,
  p.avatar_url,
  p.country,
  round(avg(d.avg_score))::int as score_30d,
  coalesce(s.current_streak, 0) as current_streak,
  rank() over (order by avg(d.avg_score) desc) as global_rank
from profiles p
left join streaks s on s.user_id = p.id
join daily_stats d on d.user_id = p.id and d.date >= current_date - 30
where p.leaderboard_optin = true
  and d.avg_score is not null
group by p.id, p.name, p.avatar_url, p.country, s.current_streak
order by avg(d.avg_score) desc
limit 100;

create unique index if not exists idx_leaderboard_id on leaderboard(id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table user_preferences enable row level security;
alter table lab_results enable row level security;
alter table meals enable row level security;
alter table daily_stats enable row level security;
alter table streaks enable row level security;
alter table meal_plans enable row level security;
alter table device_connections enable row level security;
alter table wearable_data enable row level security;
alter table nutri_patient_links enable row level security;
alter table nutri_invites enable row level security;
alter table nutri_chats enable row level security;
alter table nutri_settings enable row level security;
alter table nudges enable row level security;

-- PROFILES
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Nutris can view linked patient profiles" on profiles for select
  using (exists (select 1 from nutri_patient_links where nutri_id = auth.uid() and patient_id = profiles.id and status = 'active'));
create policy "Admins can view all profiles" on profiles for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- USER_PREFERENCES
create policy "Owner only" on user_preferences for all using (auth.uid() = user_id);

-- LAB_RESULTS
create policy "Owner only" on lab_results for all using (auth.uid() = user_id);
create policy "Nutris read linked patients labs" on lab_results for select
  using (exists (select 1 from nutri_patient_links where nutri_id = auth.uid() and patient_id = lab_results.user_id and status = 'active'));

-- MEALS
create policy "Owner only" on meals for all using (auth.uid() = user_id);
create policy "Nutris read linked patients meals" on meals for select
  using (exists (select 1 from nutri_patient_links where nutri_id = auth.uid() and patient_id = meals.user_id and status = 'active'));

-- DAILY_STATS / STREAKS / NUDGES
create policy "Owner only" on daily_stats for all using (auth.uid() = user_id);
create policy "Owner only" on streaks for all using (auth.uid() = user_id);
create policy "Owner only" on nudges for all using (auth.uid() = user_id);

-- MEAL_PLANS
create policy "Owner only" on meal_plans for all using (auth.uid() = user_id);
create policy "Nutris manage linked patients plans" on meal_plans for all
  using (exists (select 1 from nutri_patient_links where nutri_id = auth.uid() and patient_id = meal_plans.user_id and status = 'active'));

-- DEVICE_CONNECTIONS / WEARABLE_DATA
create policy "Owner only" on device_connections for all using (auth.uid() = user_id);
create policy "Owner only" on wearable_data for all using (auth.uid() = user_id);

-- NUTRI_PATIENT_LINKS
create policy "Nutri manages own links" on nutri_patient_links for all using (auth.uid() = nutri_id);
create policy "Patient can view own links" on nutri_patient_links for select using (auth.uid() = patient_id);

-- NUTRI_INVITES
create policy "Nutri manages own invites" on nutri_invites for all using (auth.uid() = nutri_id);

-- NUTRI_CHATS
create policy "Nutri and patient can read their chat" on nutri_chats for select
  using (auth.uid() = nutri_id or auth.uid() = patient_id);
create policy "Nutri can insert chat messages" on nutri_chats for insert
  using (auth.uid() = nutri_id);

-- NUTRI_SETTINGS
create policy "Nutri manages own settings" on nutri_settings for all using (auth.uid() = nutri_id);

-- LEADERBOARD (public read — only opted-in users are included)
create policy "Public read leaderboard" on profiles for select using (leaderboard_optin = true);
