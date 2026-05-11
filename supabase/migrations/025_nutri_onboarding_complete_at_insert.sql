-- ═══════════════════════════════════════════════════════════════
-- Fix: handle_new_user também precisa setar onboarding_completed=true
-- para nutris, já que eles pulam o quiz inicial de paciente.
--
-- Sem isso, um nutri criado via password+sessão imediata (Supabase
-- com email confirmation desabilitado) ficaria com onboarding_completed
-- =false. O role gate do middleware (linha 103) só roda quando
-- onboarding_completed=true, então nutri sem onboarding completado
-- poderia acessar áreas de paciente.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  meta_role text;
  is_nutri boolean;
begin
  meta_role := new.raw_user_meta_data->>'role';
  is_nutri := meta_role = 'nutricionista';
  insert into public.profiles (
    id, email, name, role,
    onboarding_completed, onboarding_completed_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when is_nutri then 'nutricionista' else 'user' end,
    is_nutri,
    case when is_nutri then now() else null end
  );
  return new;
end;
$$;
