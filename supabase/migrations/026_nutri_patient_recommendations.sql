-- Per-paciente recommendations + PDF attachments written by the linked nutricionista.
-- These feed (a) a card on the paciente dashboard and (b) every AI surface
-- that touches this paciente (meal photo analysis, WhatsApp coach) so the
-- nutri's standing guidance takes precedence over generic suggestions.

create table if not exists nutri_recommendations (
  id uuid default gen_random_uuid() primary key,
  nutri_id uuid references profiles(id) on delete cascade not null,
  patient_id uuid references profiles(id) on delete cascade not null,
  body text not null check (char_length(body) between 20 and 4000),
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create unique index if not exists uniq_active_per_patient
  on nutri_recommendations(patient_id) where is_active;

create index if not exists idx_nutri_recs_patient
  on nutri_recommendations(patient_id, created_at desc);

alter table nutri_recommendations enable row level security;

create policy "Nutri manages own patients recommendations"
  on nutri_recommendations for all
  using (
    nutri_id = auth.uid()
    and exists (
      select 1 from nutri_patient_links
      where nutri_id = auth.uid()
        and patient_id = nutri_recommendations.patient_id
        and status = 'active'
    )
  )
  with check (
    nutri_id = auth.uid()
    and exists (
      select 1 from nutri_patient_links
      where nutri_id = auth.uid()
        and patient_id = nutri_recommendations.patient_id
        and status = 'active'
    )
  );

create policy "Paciente reads own recommendations"
  on nutri_recommendations for select
  using (patient_id = auth.uid());


create table if not exists nutri_patient_attachments (
  id uuid default gen_random_uuid() primary key,
  nutri_id uuid references profiles(id) on delete cascade not null,
  patient_id uuid references profiles(id) on delete cascade not null,
  storage_path text not null,
  original_filename text,
  byte_size int,
  page_count int,
  kind text check (kind in ('meal_plan','training','exam_guidance','other')) default 'other',
  extracted_text text,
  extracted_at timestamptz,
  model text,
  created_at timestamptz default now()
);

create index if not exists idx_nutri_att_patient
  on nutri_patient_attachments(patient_id, created_at desc);

alter table nutri_patient_attachments enable row level security;

create policy "Nutri manages own patients attachments"
  on nutri_patient_attachments for all
  using (
    nutri_id = auth.uid()
    and exists (
      select 1 from nutri_patient_links
      where nutri_id = auth.uid()
        and patient_id = nutri_patient_attachments.patient_id
        and status = 'active'
    )
  )
  with check (
    nutri_id = auth.uid()
    and exists (
      select 1 from nutri_patient_links
      where nutri_id = auth.uid()
        and patient_id = nutri_patient_attachments.patient_id
        and status = 'active'
    )
  );

create policy "Paciente reads own attachments"
  on nutri_patient_attachments for select
  using (patient_id = auth.uid());


insert into storage.buckets (id, name, public)
  values ('nutri-attachments', 'nutri-attachments', false)
  on conflict (id) do nothing;

create policy "Nutri uploads attachments for linked patients"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'nutri-attachments'
    and exists (
      select 1 from nutri_patient_links
      where nutri_id = auth.uid()
        and patient_id::text = (storage.foldername(name))[1]
        and status = 'active'
    )
  );

create policy "Nutri reads attachments for linked patients"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'nutri-attachments'
    and exists (
      select 1 from nutri_patient_links
      where nutri_id = auth.uid()
        and patient_id::text = (storage.foldername(name))[1]
        and status = 'active'
    )
  );

create policy "Nutri deletes attachments for linked patients"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'nutri-attachments'
    and exists (
      select 1 from nutri_patient_links
      where nutri_id = auth.uid()
        and patient_id::text = (storage.foldername(name))[1]
        and status = 'active'
    )
  );

create policy "Paciente reads own attachments storage"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'nutri-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
