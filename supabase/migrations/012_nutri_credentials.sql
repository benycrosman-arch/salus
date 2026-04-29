-- ============================================================
-- 012 — Nutricionista credential verification
--
-- Adiciona as colunas necessárias para que um nutricionista
-- envie um certificado de registro profissional (CRN) e seja
-- verificado contra os dados públicos do Conselho Federal de
-- Nutricionistas (CFN). A verificação é executada pela edge
-- function `verify-nutri-credential` usando Claude Opus 4.7.
-- ============================================================

alter table profiles
  add column if not exists nutri_crn text,
  add column if not exists nutri_crn_state text,                       -- ex.: 'SP', 'RJ'
  add column if not exists nutri_credential_url text,                  -- caminho no bucket nutri-credentials
  add column if not exists nutri_verification_status text default 'not_submitted'
    check (nutri_verification_status in ('not_submitted','pending','verified','rejected','manual_review')),
  add column if not exists nutri_verification_data jsonb,              -- output do Claude + dados consultados
  add column if not exists nutri_verified_at timestamptz,
  add column if not exists nutri_verification_attempts integer default 0;

create index if not exists profiles_nutri_status_idx
  on profiles (nutri_verification_status)
  where role = 'nutricionista';

-- Bucket privado para os certificados. Cada arquivo fica em
-- {user_id}/{filename} e só o próprio dono lê/escreve.
insert into storage.buckets (id, name, public)
values ('nutri-credentials', 'nutri-credentials', false)
on conflict (id) do nothing;

-- Owner-only access. O service role bypassa RLS e é usado pela
-- edge function de verificação para baixar o arquivo.
drop policy if exists "Nutri uploads own credential" on storage.objects;
create policy "Nutri uploads own credential" on storage.objects
  for insert with check (
    bucket_id = 'nutri-credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Nutri reads own credential" on storage.objects;
create policy "Nutri reads own credential" on storage.objects
  for select using (
    bucket_id = 'nutri-credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Nutri updates own credential" on storage.objects;
create policy "Nutri updates own credential" on storage.objects
  for update using (
    bucket_id = 'nutri-credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Nutri deletes own credential" on storage.objects;
create policy "Nutri deletes own credential" on storage.objects
  for delete using (
    bucket_id = 'nutri-credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
