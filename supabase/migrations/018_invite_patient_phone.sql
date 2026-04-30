-- Add an optional patient phone to nutri_invites so the nutri can dispatch
-- invites over WhatsApp (wa.me deep link) instead of, or alongside, e-mail.
-- E.164 format expected ("+5511999999999"); column is nullable for back-compat.

alter table nutri_invites
  add column if not exists patient_phone text;

-- Light index for future lookup by phone (e.g., reconciling an inbound
-- WhatsApp verification with a pending invite).
create index if not exists nutri_invites_patient_phone_idx
  on nutri_invites(patient_phone) where patient_phone is not null;
