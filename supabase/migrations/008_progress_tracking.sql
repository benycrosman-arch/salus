-- ═══════════════════════════════════════════════════════════════
-- PROGRESS TRACKING — weight, body composition, measurements, photos
-- ═══════════════════════════════════════════════════════════════

-- Body composition log (one row per measurement event)
create table if not exists body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at date not null default current_date,

  -- Core
  weight_kg numeric check (weight_kg > 0 and weight_kg < 500),
  body_fat_pct numeric check (body_fat_pct >= 0 and body_fat_pct <= 70),
  muscle_mass_kg numeric check (muscle_mass_kg >= 0 and muscle_mass_kg < 200),
  water_pct numeric check (water_pct >= 0 and water_pct <= 100),
  bone_mass_kg numeric check (bone_mass_kg >= 0 and bone_mass_kg < 20),
  visceral_fat numeric check (visceral_fat >= 0 and visceral_fat < 50),
  bmr_kcal integer check (bmr_kcal >= 0 and bmr_kcal < 10000),

  -- Source: manual, scale (Mi/Withings/Tanita), wearable (Apple Health, Google Fit)
  source text not null default 'manual' check (source in ('manual','scale','wearable','import')),
  source_device text,

  notes text check (length(notes) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_body_logs_user_date on body_logs(user_id, measured_at desc);

-- Body measurements (waist, hips, etc.) — separate so users without these
-- columns don't see empty space
create table if not exists body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at date not null default current_date,

  waist_cm numeric check (waist_cm > 0 and waist_cm < 250),
  hips_cm numeric check (hips_cm > 0 and hips_cm < 250),
  chest_cm numeric check (chest_cm > 0 and chest_cm < 250),
  bicep_cm numeric check (bicep_cm > 0 and bicep_cm < 100),
  thigh_cm numeric check (thigh_cm > 0 and thigh_cm < 150),
  neck_cm numeric check (neck_cm > 0 and neck_cm < 100),

  notes text check (length(notes) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_body_measurements_user_date
  on body_measurements(user_id, measured_at desc);

-- Progress photos — image stored in Supabase Storage; this table holds metadata
create table if not exists progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  taken_at date not null default current_date,
  pose text check (pose in ('front','side','back','flex')),
  storage_path text not null, -- e.g. progress-photos/<user_id>/<uuid>.jpg
  weight_kg numeric, -- snapshot of weight at time of photo (denormalized)
  notes text check (length(notes) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_progress_photos_user_date
  on progress_photos(user_id, taken_at desc);

-- Goals — long-term targets (weight, body fat, etc.) with target dates
create table if not exists user_goals_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null check (metric in ('weight_kg','body_fat_pct','muscle_mass_kg','waist_cm')),
  target_value numeric not null,
  start_value numeric not null,
  start_date date not null default current_date,
  target_date date,
  achieved_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_goals_targets_user_active
  on user_goals_targets(user_id, active) where active = true;

-- ─── ROW-LEVEL SECURITY ───────────────────────────────────────

alter table body_logs enable row level security;
alter table body_measurements enable row level security;
alter table progress_photos enable row level security;
alter table user_goals_targets enable row level security;

drop policy if exists "body_logs_owner" on body_logs;
create policy "body_logs_owner" on body_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "body_measurements_owner" on body_measurements;
create policy "body_measurements_owner" on body_measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "progress_photos_owner" on progress_photos;
create policy "progress_photos_owner" on progress_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_goals_targets_owner" on user_goals_targets;
create policy "user_goals_targets_owner" on user_goals_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Nutritionist read-through (matches existing pattern from 001)
drop policy if exists "Nutris read linked patient body" on body_logs;
create policy "Nutris read linked patient body" on body_logs
  for select using (
    exists (
      select 1 from nutri_patient_links l
      where l.patient_id = body_logs.user_id and l.nutri_id = auth.uid() and l.status = 'active'
    )
  );

drop policy if exists "Nutris read linked patient measurements" on body_measurements;
create policy "Nutris read linked patient measurements" on body_measurements
  for select using (
    exists (
      select 1 from nutri_patient_links l
      where l.patient_id = body_measurements.user_id and l.nutri_id = auth.uid() and l.status = 'active'
    )
  );

-- ─── HELPER VIEW: latest snapshot per user ───────────────────

create or replace view latest_body_snapshot as
select distinct on (user_id)
  user_id, measured_at, weight_kg, body_fat_pct, muscle_mass_kg, water_pct, visceral_fat
from body_logs
where weight_kg is not null
order by user_id, measured_at desc, created_at desc;

revoke all on latest_body_snapshot from anon;
grant select on latest_body_snapshot to authenticated;

-- ─── STORAGE BUCKET FOR PROGRESS PHOTOS ──────────────────────
-- (Bucket creation goes in Supabase Studio: Storage → New bucket
--  Name: progress-photos | Public: NO | RLS: enabled
--  Then run the policies below.)

-- Storage RLS — owner-only via path prefix matching auth.uid()
do $$
begin
  if exists (select 1 from pg_tables where schemaname='storage' and tablename='objects') then
    -- Read own
    perform 1;
    drop policy if exists "progress_photos_storage_select_own" on storage.objects;
    create policy "progress_photos_storage_select_own" on storage.objects
      for select using (
        bucket_id = 'progress-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      );

    drop policy if exists "progress_photos_storage_insert_own" on storage.objects;
    create policy "progress_photos_storage_insert_own" on storage.objects
      for insert with check (
        bucket_id = 'progress-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      );

    drop policy if exists "progress_photos_storage_delete_own" on storage.objects;
    create policy "progress_photos_storage_delete_own" on storage.objects
      for delete using (
        bucket_id = 'progress-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end$$;
