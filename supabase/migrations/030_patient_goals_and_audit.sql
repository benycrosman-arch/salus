-- Phase A of the link/realtime rebuild (see docs/REBUILD_PLAN.md).
-- ADDITIVE ONLY — does not rename or drop any existing table. Safe to
-- deploy independently. The destructive merge of nutri_invites +
-- nutri_patient_links is intentionally NOT in this migration.
--
-- 1. patient_goals — nutri-set macro targets per (nutri, patient) link.
--    Scoped to the existing nutri_patient_links pair by composite key so
--    deletion of the link cascades the targets.
-- 2. audit_log — compliance trail for invite/link/goals events. Distinct
--    from admin_audit_log (which audits admin actions specifically).

create table if not exists patient_goals (
  id uuid primary key default gen_random_uuid(),
  nutri_id uuid not null references profiles(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  calories_target int check (calories_target > 0 and calories_target < 20000),
  protein_g int check (protein_g >= 0 and protein_g < 2000),
  carbs_g int check (carbs_g >= 0 and carbs_g < 2000),
  fat_g int check (fat_g >= 0 and fat_g < 2000),
  notes text check (length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One goals row per (nutri, patient) pair — overwrite on update, no history.
  unique (nutri_id, patient_id)
);

create index if not exists patient_goals_by_patient_idx
  on patient_goals (patient_id);

alter table patient_goals enable row level security;

-- Nutri manages goals for patients they have an active link with.
-- The `exists(...)` predicate is the same idiom used by adjacent tables
-- (meals, labs, attachments) so future RLS audits stay consistent.
create policy "nutri_manages_goals_for_linked_patient" on patient_goals
  for all using (
    nutri_id = auth.uid()
    and exists (
      select 1 from nutri_patient_links l
      where l.nutri_id = patient_goals.nutri_id
        and l.patient_id = patient_goals.patient_id
        and l.status = 'active'
    )
  )
  with check (
    nutri_id = auth.uid()
    and exists (
      select 1 from nutri_patient_links l
      where l.nutri_id = patient_goals.nutri_id
        and l.patient_id = patient_goals.patient_id
        and l.status = 'active'
    )
  );

create policy "patient_reads_own_goals" on patient_goals
  for select using (patient_id = auth.uid());

-- Bump updated_at on every write
create or replace function patient_goals_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_patient_goals_updated_at on patient_goals;
create trigger trg_patient_goals_updated_at
  before update on patient_goals
  for each row execute function patient_goals_touch_updated_at();

-- ────────────────────────────────────────────────────────────────

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null check (length(action) <= 64),
  entity text not null check (length(entity) <= 64),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text check (length(user_agent) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists audit_log_actor_idx
  on audit_log (actor_id, created_at desc);
create index if not exists audit_log_entity_idx
  on audit_log (entity, entity_id);
create index if not exists audit_log_action_idx
  on audit_log (action, created_at desc);

alter table audit_log enable row level security;

-- Users can read only their own audit rows.
create policy "audit_self_read" on audit_log
  for select using (actor_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies — writes happen exclusively via the
-- security-definer log_audit() function below, which bypasses RLS.

create or replace function log_audit(
  p_action text,
  p_entity text,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_ip inet default null,
  p_user_agent text default null
) returns audit_log
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row audit_log;
begin
  insert into audit_log (actor_id, action, entity, entity_id, metadata, ip_address, user_agent)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_metadata, '{}'::jsonb), p_ip, p_user_agent)
  returning * into row;
  return row;
end;
$$;

-- Tighten function privilege — only authenticated users can call.
revoke all on function log_audit(text, text, uuid, jsonb, inet, text) from public;
grant execute on function log_audit(text, text, uuid, jsonb, inet, text) to authenticated;

notify pgrst, 'reload schema';
