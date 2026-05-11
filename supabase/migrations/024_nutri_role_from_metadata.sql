-- ═══════════════════════════════════════════════════════════════
-- Fix: handle_new_user precisa ler role do user_metadata
--
-- Bug:
--   1. Migration 001 cria profile com role='user' default (trigger
--      handle_new_user não lê user_metadata.role).
--   2. Migration 011 instala guard_profile_admin_columns que, em
--      qualquer UPDATE feito por não-admin, reverte new.role := old.role.
--   3. Resultado: signup como nutricionista chega no Supabase com
--      raw_user_meta_data.role='nutricionista', mas profile.role fica
--      preso em 'user'. A página de signup tenta dar UPDATE pra
--      'nutricionista' e o guard reverte silenciosamente.
--   4. Middleware vê role='user' tentando acessar /nutri → bounce
--      pra /dashboard.
--
-- Fix:
--   - O trigger lê raw_user_meta_data->>'role' no INSERT. INSERT não
--     passa pelo guard (BEFORE UPDATE), então o role correto persiste.
--   - Backfill: corrige profiles existentes que estão presos em 'user'
--     apesar do user_metadata declarar 'nutricionista'. O guard é
--     desabilitado temporariamente porque o backfill roda como postgres
--     (sem JWT, então a checagem `auth.role() = 'service_role'` falha).
-- ═══════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  meta_role text;
begin
  meta_role := new.raw_user_meta_data->>'role';
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case
      when meta_role in ('user','nutricionista') then meta_role
      else 'user'
    end
  );
  return new;
end;
$$;

-- Backfill: nutris travados em role='user'
alter table public.profiles disable trigger trg_guard_profile_admin_columns;

update public.profiles p
set
  role = 'nutricionista',
  onboarding_completed = true,
  onboarding_completed_at = coalesce(p.onboarding_completed_at, now()),
  updated_at = now()
from auth.users u
where p.id = u.id
  and (u.raw_user_meta_data->>'role') = 'nutricionista'
  and p.role = 'user';

alter table public.profiles enable trigger trg_guard_profile_admin_columns;
