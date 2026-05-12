-- Out-of-band access code on every new invite. The nutri sees the code once
-- at creation time and shares it with the patient via a different channel
-- (verbal, message, etc). The patient must present BOTH the URL token AND
-- the code to accept — single-channel compromise (forwarded link, leaked
-- email) is no longer enough.
--
-- Existing rows have NULL code_hash → accept route grandfathers them in
-- without requiring a code. New invites always get one.
--
-- Default expires_at shortened from 7 days → 24 hours per product spec.
-- Existing rows keep whatever expiry they were issued with.

alter table public.nutri_invites
  add column if not exists code_hash text,
  add column if not exists code_attempts integer not null default 0;

alter table public.nutri_invites
  alter column expires_at set default (now() + interval '24 hours');

notify pgrst, 'reload schema';
