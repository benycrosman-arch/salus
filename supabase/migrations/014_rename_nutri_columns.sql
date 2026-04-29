-- ============================================================
-- 014 — Realign live schema with migration history.
--
-- The hosted DB drifted from the migration files: nutri_patient_links has
-- a `client_id` column where the migrations + application code expect
-- `patient_id`, and nutri_invites has `email` where they expect
-- `patient_email`. This drift silently broke the entire patient invite
-- and dashboard flow (Supabase queries returned errors that the app
-- swallowed via `?? []`).
--
-- This migration brings the live DB in line with file-based truth.
-- It is idempotent — only renames if the old column still exists,
-- so re-runs are safe.
-- ============================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nutri_patient_links'
      and column_name = 'client_id'
  ) then
    alter table public.nutri_patient_links rename column client_id to patient_id;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nutri_invites'
      and column_name = 'email'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nutri_invites'
      and column_name = 'patient_email'
  ) then
    alter table public.nutri_invites rename column email to patient_email;
  end if;
end $$;
