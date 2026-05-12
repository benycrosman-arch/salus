-- Realign nutri_invites with code that expects `patient_email`, and drop the
-- WhatsApp-only `patient_phone` column now that invites are e-mail only.
-- Idempotent: safe to re-run. The pgrst NOTIFY at the end forces PostgREST
-- to refresh its schema cache without waiting for a restart — fixes the
-- "Could not find the 'patient_email' column ... in the schema cache" error
-- when the live DB had drifted from migration 014.

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

drop index if exists nutri_invites_patient_phone_idx;

alter table public.nutri_invites
  drop column if exists patient_phone;

notify pgrst, 'reload schema';
