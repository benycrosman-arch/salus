-- cancel_invitation: nutri cancela um convite pendente antes do paciente
-- aceitar. Atômico: flip de status, wipe do code_plaintext, audit, tudo
-- numa transação. Idempotente — segundo call num convite já cancelado
-- retorna ok sem efeito.
--
-- Não usa o nome 'delete_invitation' porque a gente NÃO deleta a linha —
-- preserva pra histórico/auditoria. Status vira 'expired' (enum já
-- existente em nutri_invites).

create or replace function cancel_invitation(p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  acting_uid uuid := auth.uid();
  inv nutri_invites;
begin
  if acting_uid is null then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  select * into inv from nutri_invites where id = p_invite_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found',
      'error', 'Convite não encontrado.');
  end if;

  if inv.nutri_id <> acting_uid then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Idempotent: já cancelado/expirado/aceito, só retorna ok.
  if inv.status <> 'pending' then
    return jsonb_build_object('ok', true, 'status', inv.status, 'already_settled', true);
  end if;

  update nutri_invites
    set status = 'expired',
        code_plaintext = null
    where id = p_invite_id;

  perform log_audit(
    'invite_cancelled',
    'nutri_invites',
    p_invite_id,
    jsonb_build_object(
      'patient_email', inv.patient_email,
      'prior_status', 'pending'
    )
  );

  return jsonb_build_object('ok', true, 'status', 'expired');
end;
$$;

revoke all on function cancel_invitation(uuid) from public;
grant execute on function cancel_invitation(uuid) to authenticated;

notify pgrst, 'reload schema';
