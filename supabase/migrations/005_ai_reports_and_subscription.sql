-- AI content reports + subscription columns
-- Apple/Google require a way for users to flag harmful or inaccurate AI output

create table if not exists ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  reason text not null check (reason in ('incorrect','harmful','misleading','offensive','other')),
  note text,
  surface text,
  meal_id uuid,
  content_snapshot text,
  reviewed boolean default false,
  created_at timestamptz default now()
);

alter table ai_reports enable row level security;

-- Users can insert their own reports; no one reads via anon
drop policy if exists "ai_reports_insert_own" on ai_reports;
create policy "ai_reports_insert_own" on ai_reports
  for insert to authenticated
  with check (auth.uid() = user_id or user_id is null);

-- Subscription tracking columns on profiles (written by the RevenueCat webhook)
alter table profiles
  add column if not exists revenuecat_app_user_id text,
  add column if not exists subscription_status text default 'free',
  add column if not exists subscription_product_id text,
  add column if not exists subscription_expires_at timestamptz;

create index if not exists idx_profiles_rc_app_user_id on profiles(revenuecat_app_user_id);
