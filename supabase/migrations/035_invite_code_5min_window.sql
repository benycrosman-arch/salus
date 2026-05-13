-- Add a 5-minute window during which the nutri can see the raw access code,
-- then it self-destructs. Code is per-invite (one per patient) and burns
-- on first successful acceptance.
--
-- Why store plaintext at all: the nutri shares the code out-of-band
-- (WhatsApp / verbal / in consultation). If they close the tab they need
-- to be able to recover it within the 5-min window. The hash alone isn't
-- recoverable, so we keep the plaintext beside it for a brief TTL.
--
-- Security boundary: code_plaintext is wiped automatically on
--   (a) lazy access after the TTL,
--   (b) successful accept_invitation,
--   (c) ANY status flip to 'expired'.
-- The code_hash column (used for verification) stays — it's one-way and
-- safe to retain for the full 24h invite lifetime.

alter table nutri_invites
  add column if not exists code_plaintext text,
  add column if not exists code_plaintext_expires_at timestamptz;

-- Update create_invitation: populate plaintext + 5-min expiry on insert.
create or replace function create_invitation(
  p_patient_email text,
  p_raw_code text,
  p_expires_in_hours int default 24,
  p_hourly_cap int default 30,
  p_daily_cap int default 100
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  acting_uid uuid := auth.uid();
  acting_role text;
  acting_email text;
  acting_name text;
  hourly_count int;
  daily_count int;
  dup_count int;
  new_id uuid := gen_random_uuid();
  normalized_email text;
  normalized_code text;
  computed_hash text;
  new_invite nutri_invites;
begin
  if acting_uid is null then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  normalized_email := lower(trim(p_patient_email));
  if normalized_email = '' or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_email',
      'error', 'E-mail inválido.');
  end if;

  normalized_code := regexp_replace(upper(coalesce(p_raw_code, '')), '[^A-Z0-9]', '', 'g');
  if length(normalized_code) <> 6 then
    return jsonb_build_object('ok', false, 'code', 'invalid_code',
      'error', 'Código deve ter 6 caracteres.');
  end if;

  select role, email, name into acting_role, acting_email, acting_name
  from profiles where id = acting_uid;
  if acting_role is distinct from 'nutricionista' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if lower(coalesce(acting_email, '')) = normalized_email then
    return jsonb_build_object('ok', false, 'code', 'self_invite',
      'error', 'Você não pode convidar o seu próprio e-mail.');
  end if;

  select count(*) into hourly_count from nutri_invites
    where nutri_id = acting_uid and created_at > now() - interval '1 hour';
  if hourly_count >= p_hourly_cap then
    return jsonb_build_object('ok', false, 'code', 'hourly_cap',
      'error', format('Limite horário de convites atingido (%s/h).', p_hourly_cap));
  end if;
  select count(*) into daily_count from nutri_invites
    where nutri_id = acting_uid and created_at > now() - interval '1 day';
  if daily_count >= p_daily_cap then
    return jsonb_build_object('ok', false, 'code', 'daily_cap',
      'error', format('Limite diário de convites atingido (%s/dia).', p_daily_cap));
  end if;

  select count(*) into dup_count from nutri_invites
    where nutri_id = acting_uid
      and lower(patient_email) = normalized_email
      and status = 'pending'
      and expires_at > now();
  if dup_count > 0 then
    return jsonb_build_object('ok', false, 'code', 'duplicate_pending',
      'error', 'Já existe um convite pendente para este e-mail.');
  end if;

  computed_hash := encode(extensions.digest(new_id::text || ':' || normalized_code, 'sha256'), 'hex');

  begin
    insert into nutri_invites (
      id, nutri_id, patient_email, code_hash,
      code_plaintext, code_plaintext_expires_at,
      expires_at
    ) values (
      new_id, acting_uid, normalized_email, computed_hash,
      normalized_code, now() + interval '5 minutes',
      now() + (p_expires_in_hours || ' hours')::interval
    ) returning * into new_invite;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'duplicate_pending',
      'error', 'Já existe um convite pendente para este e-mail.');
  end;

  perform log_audit(
    'invite_created',
    'nutri_invites',
    new_invite.id,
    jsonb_build_object(
      'patient_email', normalized_email,
      'expires_at', new_invite.expires_at
    )
  );

  return jsonb_build_object(
    'ok', true,
    'invite', jsonb_build_object(
      'id', new_invite.id,
      'token', new_invite.token,
      'patient_email', new_invite.patient_email,
      'expires_at', new_invite.expires_at,
      'code_visible_until', new_invite.code_plaintext_expires_at
    ),
    'nutri_name', coalesce(acting_name, split_part(coalesce(acting_email, ''), '@', 1))
  );
end;
$$;

revoke all on function create_invitation(text, text, int, int, int) from public;
grant execute on function create_invitation(text, text, int, int, int) to authenticated;

-- Update accept_invitation: wipe code_plaintext on the success path.
create or replace function accept_invitation(
  p_token text,
  p_code text default null,
  p_max_attempts int default 5
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  acting_uid uuid := auth.uid();
  acting_email text;
  acting_role text;
  inv nutri_invites;
  expected_hash text;
  actual_hash text;
  normalized_code text;
  new_attempt_count int;
begin
  if acting_uid is null then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  select * into inv from nutri_invites
    where token = lower(trim(p_token))
    for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found',
      'error', 'Convite inválido.');
  end if;

  if inv.expires_at < now() then
    update nutri_invites
      set status = 'expired',
          code_plaintext = null
      where id = inv.id;
    return jsonb_build_object('ok', false, 'code', 'expired',
      'error', 'Convite expirado.');
  end if;

  if inv.status = 'accepted' then
    return jsonb_build_object('ok', true, 'nutri_id', inv.nutri_id, 'already_accepted', true);
  end if;

  if inv.nutri_id = acting_uid then
    return jsonb_build_object('ok', false, 'code', 'self_invite',
      'error', 'Você não pode aceitar seu próprio convite.');
  end if;

  select email, role into acting_email, acting_role
  from profiles where id = acting_uid;
  if lower(coalesce(acting_email, '')) <> lower(inv.patient_email) then
    return jsonb_build_object('ok', false, 'code', 'email_mismatch',
      'error', 'Este convite foi enviado para outro e-mail.',
      'invited_email', inv.patient_email);
  end if;
  if acting_role = 'nutricionista' then
    return jsonb_build_object('ok', false, 'code', 'role_conflict',
      'error', 'Esta conta é de nutricionista.');
  end if;

  if inv.code_hash is not null then
    if coalesce(inv.code_attempts, 0) >= p_max_attempts then
      update nutri_invites
        set status = 'expired',
            code_plaintext = null
        where id = inv.id;
      return jsonb_build_object('ok', false, 'code', 'code_locked',
        'error', 'Muitas tentativas erradas. O convite foi bloqueado.');
    end if;

    normalized_code := regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g');
    if length(normalized_code) <> 6 then
      return jsonb_build_object('ok', false, 'code', 'code_required',
        'error', 'Código de acesso obrigatório (6 caracteres).');
    end if;

    expected_hash := inv.code_hash;
    actual_hash := encode(extensions.digest(inv.id::text || ':' || normalized_code, 'sha256'), 'hex');

    if expected_hash <> actual_hash then
      new_attempt_count := coalesce(inv.code_attempts, 0) + 1;
      update nutri_invites
        set code_attempts = new_attempt_count,
            status = case when new_attempt_count >= p_max_attempts then 'expired' else status end,
            code_plaintext = case when new_attempt_count >= p_max_attempts then null else code_plaintext end
        where id = inv.id;
      return jsonb_build_object('ok', false, 'code', 'code_invalid',
        'error', 'Código incorreto.',
        'remaining', greatest(0, p_max_attempts - new_attempt_count));
    end if;
  end if;

  insert into nutri_patient_links (nutri_id, patient_id, status)
  values (inv.nutri_id, acting_uid, 'active')
  on conflict (nutri_id, patient_id)
  do update set status = 'active';

  -- Success: mark accepted AND burn the plaintext code (defense in depth —
  -- once used, no future leak of the code can re-use it).
  update nutri_invites
    set status = 'accepted',
        code_plaintext = null
    where id = inv.id;

  perform log_audit(
    'invite_accepted',
    'nutri_invites',
    inv.id,
    jsonb_build_object(
      'nutri_id', inv.nutri_id,
      'patient_id', acting_uid
    )
  );

  return jsonb_build_object('ok', true, 'nutri_id', inv.nutri_id);
end;
$$;

revoke all on function accept_invitation(text, text, int) from public;
grant execute on function accept_invitation(text, text, int) to authenticated;

-- Retrieval RPC: nutri-only, returns the raw code if still within the
-- 5-min window. Lazy-cleanups expired plaintext on first stale read.
create or replace function get_invite_code(p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  acting_uid uuid := auth.uid();
  inv_nutri_id uuid;
  inv_code text;
  inv_expires_at timestamptz;
  inv_status text;
begin
  if acting_uid is null then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  select nutri_id, code_plaintext, code_plaintext_expires_at, status
    into inv_nutri_id, inv_code, inv_expires_at, inv_status
    from nutri_invites where id = p_invite_id;

  if inv_nutri_id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if inv_nutri_id <> acting_uid then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if inv_status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'not_pending');
  end if;

  if inv_code is null or inv_expires_at is null then
    return jsonb_build_object('ok', false, 'code', 'code_expired');
  end if;

  if inv_expires_at < now() then
    update nutri_invites set code_plaintext = null where id = p_invite_id;
    return jsonb_build_object('ok', false, 'code', 'code_expired');
  end if;

  return jsonb_build_object(
    'ok', true,
    'access_code', inv_code,
    'expires_at', inv_expires_at
  );
end;
$$;

revoke all on function get_invite_code(uuid) from public;
grant execute on function get_invite_code(uuid) to authenticated;

notify pgrst, 'reload schema';
