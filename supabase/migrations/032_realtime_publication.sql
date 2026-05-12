-- Enable Realtime postgres_changes broadcasts on the tables the new client
-- subscriptions in src/app/nutri/pacientes/realtime-refresher.tsx listen to.
--
-- Supabase auto-includes the supabase_realtime publication, but new tables
-- aren't always added automatically depending on project age and how the
-- table was created. Explicit ALTER PUBLICATION is idempotent (no-op when
-- the table is already a member) so it's safe to re-run.

do $$
begin
  -- The publication may not exist in fresh / local setups. Create it
  -- empty so the subsequent ALTERs always succeed.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'nutri_patient_links'
  ) then
    alter publication supabase_realtime add table public.nutri_patient_links;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'nutri_invites'
  ) then
    alter publication supabase_realtime add table public.nutri_invites;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'patient_goals'
  ) then
    alter publication supabase_realtime add table public.patient_goals;
  end if;
end $$;
