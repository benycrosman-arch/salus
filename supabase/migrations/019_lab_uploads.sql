-- Lab PDF uploads: one PDF can produce many lab_results rows. We keep the
-- original file in private Storage so the nutricionista can re-open it later,
-- and we keep the raw model output (raw_extraction) for debug/replay without
-- re-spending Claude tokens.

create table if not exists lab_uploads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  storage_path text not null,
  original_filename text,
  byte_size int,
  page_count int,
  parsed_at timestamptz,
  markers_extracted int,
  model text,
  raw_extraction jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_lab_uploads_user on lab_uploads(user_id, created_at desc);

alter table lab_uploads enable row level security;

create policy "Owner only" on lab_uploads for all using (auth.uid() = user_id);
create policy "Nutris read linked patients uploads" on lab_uploads for select
  using (exists (
    select 1 from nutri_patient_links
    where nutri_id = auth.uid()
      and patient_id = lab_uploads.user_id
      and status = 'active'
  ));

-- Tag every parsed marker with its source PDF (nullable for legacy manual rows).
alter table lab_results add column if not exists upload_id uuid
  references lab_uploads(id) on delete set null;

create index if not exists idx_lab_results_upload on lab_results(upload_id);

-- Private bucket for the raw PDFs. Path convention enforced by RLS:
--   lab-pdfs/{user_id}/{upload_id}.pdf
insert into storage.buckets (id, name, public)
  values ('lab-pdfs', 'lab-pdfs', false)
  on conflict (id) do nothing;

create policy "Users upload own lab PDFs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lab-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read own lab PDFs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lab-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own lab PDFs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'lab-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Nutris read linked patients lab PDFs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lab-pdfs'
    and exists (
      select 1 from nutri_patient_links
      where nutri_id = auth.uid()
        and patient_id::text = (storage.foldername(name))[1]
        and status = 'active'
    )
  );
