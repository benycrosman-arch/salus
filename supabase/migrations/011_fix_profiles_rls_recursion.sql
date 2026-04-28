-- ═══════════════════════════════════════════════════════════════
-- Fix: infinite recursion in RLS policies on `profiles`
--
-- The policies "Admins can view all profiles" and
-- "users_update_own_profile_safe" both ran SELECTs against `profiles`
-- inside their USING / WITH CHECK clauses. Each row evaluation
-- re-triggered RLS evaluation, infinitely.
--
-- Fix: move the lookups into SECURITY DEFINER functions that bypass
-- RLS (the function owner is `postgres`, which is the table owner).
-- The policies then reference the function instead of the table.
-- ═══════════════════════════════════════════════════════════════

-- 1. Helper: is the caller an admin? (bypasses RLS via SECURITY DEFINER)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

-- 2. BEFORE UPDATE trigger: reset admin-controlled columns to their
-- old values for any non-admin caller. This replaces the recursive
-- subquery comparisons that lived in the old WITH CHECK clause.
create or replace function public.guard_profile_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Service role and admins bypass the guard.
  if (auth.role() = 'service_role') or public.is_admin() then
    return new;
  end if;
  -- Non-admins keep the existing values for guarded columns.
  new.ai_enabled       := old.ai_enabled;
  new.account_status   := old.account_status;
  new.daily_ai_limit   := old.daily_ai_limit;
  new.monthly_ai_limit := old.monthly_ai_limit;
  new.role             := old.role;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_admin_columns on public.profiles;
create trigger trg_guard_profile_admin_columns
  before update on public.profiles
  for each row execute procedure public.guard_profile_admin_columns();

-- 3. Replace the recursive SELECT policy for admins.
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles
  for select
  using (public.is_admin());

-- 4. Replace the recursive UPDATE policy. The trigger above enforces
-- that protected columns can't change; the policy just gates *who* can
-- update their own row.
drop policy if exists "users_update_own_profile_safe" on public.profiles;
create policy "users_update_own_profile" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
