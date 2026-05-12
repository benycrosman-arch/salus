-- Race-proof guarantee for the duplicate-pending invite check.
-- Without this, two parallel POSTs to /api/nutri/invite for the same
-- (nutri, email) both pass the application-level dup check and both insert,
-- so the patient gets two emails. The partial index closes the window.
-- Lowercased so the guard is case-insensitive (matches normalization in
-- src/lib/invite-security.ts).

create unique index if not exists nutri_invites_one_pending_per_email_idx
  on public.nutri_invites (nutri_id, lower(patient_email))
  where status = 'pending';

notify pgrst, 'reload schema';
