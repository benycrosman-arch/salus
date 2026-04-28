-- ═══════════════════════════════════════════════════════════════
-- AI SECURITY HARDENING
-- Rate limiting, kill switches, abuse logging, admin RPCs.
-- Adapted to existing schema: profiles (not user_profiles),
-- meals (not food_logs), user_preferences (not nutrition_goals).
-- ═══════════════════════════════════════════════════════════════

-- ─── TABLES ────────────────────────────────────────────────────

create table if not exists ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tokens_used integer not null default 0,
  model text not null,
  edge_function text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_user_date on ai_usage_log(user_id, created_at desc);

create table if not exists abuse_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  content text,
  edge_function text,
  created_at timestamptz not null default now()
);

create index if not exists idx_abuse_reports_user_date on abuse_reports(user_id, created_at desc);

create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null,
  target_user_id uuid,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into app_config (key, value) values
  ('ai_globally_enabled', 'true')
on conflict (key) do nothing;

-- ─── PROFILES — kill-switch + per-user limits ──────────────────

alter table profiles add column if not exists ai_enabled boolean not null default true;
alter table profiles add column if not exists account_status text not null default 'active';
alter table profiles add column if not exists daily_ai_limit integer not null default 50;
alter table profiles add column if not exists monthly_ai_limit integer not null default 500;

-- ─── RATE LIMIT FUNCTION ───────────────────────────────────────

create or replace function check_rate_limit(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  daily_count integer;
  minute_count integer;
  user_daily_limit integer;
begin
  select daily_ai_limit into user_daily_limit
  from profiles where id = p_user_id;

  select count(*) into daily_count
  from ai_usage_log
  where user_id = p_user_id
    and created_at > now() - interval '24 hours';

  select count(*) into minute_count
  from ai_usage_log
  where user_id = p_user_id
    and created_at > now() - interval '60 seconds';

  if daily_count >= coalesce(user_daily_limit, 50) then return false; end if;
  if minute_count >= 10 then return false; end if;
  return true;
end;
$$;

revoke all on function check_rate_limit(uuid) from public;
grant execute on function check_rate_limit(uuid) to authenticated, service_role;

-- ─── ADMIN KILL-SWITCH RPCs ────────────────────────────────────

create or replace function admin_disable_ai_for_user(
  target_user_id uuid,
  reason text default 'ToS violation'
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from admin_users where id = auth.uid()) then
    raise exception 'Unauthorized: admin access required';
  end if;

  update profiles
  set ai_enabled = false,
      account_status = 'suspended',
      updated_at = now()
  where id = target_user_id;

  insert into admin_audit_log (admin_id, action, target_user_id, reason)
  values (auth.uid(), 'disable_ai', target_user_id, reason);
end;
$$;

create or replace function admin_enable_ai_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from admin_users where id = auth.uid()) then
    raise exception 'Unauthorized: admin access required';
  end if;

  update profiles
  set ai_enabled = true,
      account_status = 'active',
      updated_at = now()
  where id = target_user_id;

  insert into admin_audit_log (admin_id, action, target_user_id, reason)
  values (auth.uid(), 'enable_ai', target_user_id, 'Manual re-enable');
end;
$$;

revoke all on function admin_disable_ai_for_user(uuid, text) from public;
revoke all on function admin_enable_ai_for_user(uuid) from public;
grant execute on function admin_disable_ai_for_user(uuid, text) to authenticated;
grant execute on function admin_enable_ai_for_user(uuid) to authenticated;

-- ─── PROFILES UPDATE GUARD ─────────────────────────────────────
-- Users cannot self-modify ai_enabled, account_status, or limits.
-- The existing 001 policy "Users can update own profile" is too permissive;
-- replace it with one that explicitly excludes admin-controlled columns.

drop policy if exists "Users can update own profile" on profiles;

create policy "users_update_own_profile_safe" on profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and ai_enabled       = (select ai_enabled       from profiles where id = auth.uid())
    and account_status   = (select account_status   from profiles where id = auth.uid())
    and daily_ai_limit   = (select daily_ai_limit   from profiles where id = auth.uid())
    and monthly_ai_limit = (select monthly_ai_limit from profiles where id = auth.uid())
  );

-- ─── RLS ON NEW TABLES ─────────────────────────────────────────

alter table ai_usage_log enable row level security;
alter table abuse_reports enable row level security;
alter table admin_users enable row level security;
alter table admin_audit_log enable row level security;
alter table app_config enable row level security;

-- ai_usage_log: user reads own, no client inserts
drop policy if exists "ai_usage_select_own" on ai_usage_log;
create policy "ai_usage_select_own" on ai_usage_log
  for select using (auth.uid() = user_id);

drop policy if exists "ai_usage_block_client_insert" on ai_usage_log;
create policy "ai_usage_block_client_insert" on ai_usage_log
  for insert with check (false);

-- abuse_reports: no client access (service role only)
drop policy if exists "abuse_reports_no_client" on abuse_reports;
create policy "abuse_reports_no_client" on abuse_reports
  for all using (false) with check (false);

-- admin_users: visible to admins only
drop policy if exists "admin_users_admin_read" on admin_users;
create policy "admin_users_admin_read" on admin_users
  for select using (exists (select 1 from admin_users a where a.id = auth.uid()));

-- admin_audit_log: admins read only
drop policy if exists "audit_log_admin_read" on admin_audit_log;
create policy "audit_log_admin_read" on admin_audit_log
  for select using (exists (select 1 from admin_users where id = auth.uid()));

-- app_config: public read (so Edge can check kill switch even with anon JWT),
-- admin-only write
drop policy if exists "app_config_public_read" on app_config;
create policy "app_config_public_read" on app_config
  for select using (true);

drop policy if exists "app_config_admin_update" on app_config;
create policy "app_config_admin_update" on app_config
  for update using (exists (select 1 from admin_users where id = auth.uid()));

-- ─── REVOKE ANON ACCESS TO SENSITIVE TABLES ────────────────────

revoke all on ai_usage_log from anon;
revoke all on abuse_reports from anon;
revoke all on admin_audit_log from anon;
revoke all on admin_users from anon;

-- ─── MONITORING VIEWS ──────────────────────────────────────────

create or replace view ai_abuse_candidates as
select
  user_id,
  count(*) as request_count_24h,
  sum(tokens_used) as total_tokens_24h,
  max(created_at) as last_request
from ai_usage_log
where created_at > now() - interval '24 hours'
group by user_id
having count(*) > 100
order by request_count_24h desc;

create or replace view monthly_ai_cost_estimate as
select
  date_trunc('month', created_at) as month,
  sum(tokens_used) as total_tokens,
  round((sum(tokens_used)::numeric * 0.000009)::numeric, 2) as estimated_cost_usd
from ai_usage_log
group by 1
order by 1 desc;

-- Views inherit RLS from base tables. Restrict explicitly anyway.
revoke all on ai_abuse_candidates from anon, authenticated;
revoke all on monthly_ai_cost_estimate from anon, authenticated;
grant select on ai_abuse_candidates to service_role;
grant select on monthly_ai_cost_estimate to service_role;

-- ─── RLS AUDIT — must return zero rows after this migration ────

-- Tables in public schema without any RLS policy:
select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and rowsecurity = true
  and tablename not in (select tablename from pg_policies where schemaname = 'public');
