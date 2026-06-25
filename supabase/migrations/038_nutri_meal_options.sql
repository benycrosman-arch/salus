-- Per-paciente meal options ("banco de opções") authored by the linked
-- nutricionista — manually or via the "Gerar com IA" button, which grounds
-- the suggestions in the paciente's labs, goals, standing recommendations,
-- uploaded material and recent meal history ("coisas a melhorar").
--
-- The paciente sees these grouped by meal type on /plan and can swap a single
-- option for a "similar but different" AI variation. A swap is stored as a
-- patient-owned row pointing at the original via parent_option_id, so the
-- nutri's plan stays intact and the variation can be reverted.

create table if not exists nutri_meal_options (
  id uuid primary key default gen_random_uuid(),
  nutri_id uuid not null references profiles(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  -- who actually wrote the row: the nutri, or the paciente (a swap)
  created_by uuid not null references profiles(id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast','snack1','lunch','snack2','dinner')),
  title text not null check (char_length(title) between 2 and 200),
  description text check (char_length(coalesce(description, '')) <= 2000),
  -- {calories, protein_g, carbs_g, fat_g, fiber_g}
  macros jsonb not null default '{}'::jsonb,
  source text not null default 'manual' check (source in ('manual','ai','patient_swap')),
  parent_option_id uuid references nutri_meal_options(id) on delete set null,
  is_active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meal_options_patient
  on nutri_meal_options(patient_id, meal_type, position);
create index if not exists idx_meal_options_parent
  on nutri_meal_options(parent_option_id);

alter table nutri_meal_options enable row level security;

-- Nutri does full CRUD on options for patients they actively follow. Same
-- exists(...) idiom as nutri_recommendations / patient_goals.
create policy "Nutri manages own patients meal options"
  on nutri_meal_options for all
  using (
    nutri_id = auth.uid()
    and exists (
      select 1 from nutri_patient_links
      where nutri_id = auth.uid()
        and patient_id = nutri_meal_options.patient_id
        and status = 'active'
    )
  )
  with check (
    nutri_id = auth.uid()
    and exists (
      select 1 from nutri_patient_links
      where nutri_id = auth.uid()
        and patient_id = nutri_meal_options.patient_id
        and status = 'active'
    )
  );

create policy "Paciente reads own meal options"
  on nutri_meal_options for select
  using (patient_id = auth.uid());

-- Paciente manages only their own swap variations (created_by = self). The API
-- enforces source = 'patient_swap' and a valid parent; the WITH CHECK keeps a
-- direct client from mislabelling a row as nutri-authored.
create policy "Paciente manages own meal swaps"
  on nutri_meal_options for all
  using (
    patient_id = auth.uid()
    and created_by = auth.uid()
    and source = 'patient_swap'
  )
  with check (
    patient_id = auth.uid()
    and created_by = auth.uid()
    and source = 'patient_swap'
  );

create or replace function nutri_meal_options_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_meal_options_updated_at on nutri_meal_options;
create trigger trg_meal_options_updated_at
  before update on nutri_meal_options
  for each row execute function nutri_meal_options_touch_updated_at();

notify pgrst, 'reload schema';
