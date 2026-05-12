-- Phase A of the link/realtime rebuild — RPC for revoking a nutri↔patient
-- link. Works against the EXISTING nutri_patient_links table (no merge yet).
--
-- Either party can revoke (nutri ends the relationship, patient withdraws
-- consent). Idempotent — second call on an already-revoked link returns
-- the row unchanged.
--
-- Side effects:
--   - status flips to 'ended' (existing enum: 'pending'|'active'|'ended')
--   - audit_log row written via log_audit() from migration 030
--
-- Why an RPC instead of a route handler: the audit write must be
-- transactional with the status change. A route doing two separate
-- queries can crash between them and leave audit gaps.

create or replace function revoke_link(p_link_id uuid)
returns nutri_patient_links
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row nutri_patient_links;
  acting_uid uuid := auth.uid();
begin
  if acting_uid is null then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  -- Lock the row for the duration of the transaction so concurrent
  -- revoke attempts don't race the audit write.
  select * into row from nutri_patient_links where id = p_link_id for update;
  if not found then
    raise exception 'link_not_found' using errcode = 'P0002';
  end if;

  if row.nutri_id <> acting_uid and row.patient_id <> acting_uid then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Idempotent — already ended, just return current state.
  if row.status = 'ended' then
    return row;
  end if;

  update nutri_patient_links
    set status = 'ended'
    where id = p_link_id
    returning * into row;

  perform log_audit(
    'link_revoked',
    'nutri_patient_links',
    p_link_id,
    jsonb_build_object(
      'revoked_by', acting_uid,
      'nutri_id', row.nutri_id,
      'patient_id', row.patient_id,
      'prior_status', 'active'
    )
  );

  return row;
end;
$$;

revoke all on function revoke_link(uuid) from public;
grant execute on function revoke_link(uuid) to authenticated;

notify pgrst, 'reload schema';
