-- ============================================================
-- Salus — Nutricionista pula etapa de onboarding intermediária.
--
-- Decisão: nutri faz signup e cai direto em /nutri. Nada de form
-- /onboarding-nutri no meio. Telefone, especialidade e bio passam
-- a ser opcionais e editáveis em /nutri/config quando o nutri
-- quiser preencher.
--
-- Marca todos os profiles role='nutricionista' como
-- onboarding_completed=true pra middleware e auth callback nunca
-- redirecionarem ninguém pra /onboarding-nutri.
-- ============================================================

update profiles
  set
    onboarding_completed = true,
    onboarding_completed_at = coalesce(onboarding_completed_at, now()),
    updated_at = now()
  where role = 'nutricionista'
    and onboarding_completed is distinct from true;
