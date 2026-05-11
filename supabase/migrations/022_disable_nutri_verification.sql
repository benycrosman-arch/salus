-- ============================================================
-- Salus — Temporariamente desativa o gate de verificação CRN.
--
-- O painel /nutri é liberado para todos os usuários com
-- role='nutricionista' sem passar por /aguardando-verificacao.
-- A coluna nutri_verification_status, a tabela de credenciais e
-- a Edge Function verify-nutri-credential continuam existindo —
-- só o gate no middleware/auth-callback/onboarding deixa de
-- olhar para o status.
--
-- Para reativar: rodar o /api/nutri/reset-verification para os
-- afetados ou um UPDATE manual revertendo para 'pending'/'not_submitted'.
-- ============================================================

update profiles
  set
    nutri_verification_status = 'verified',
    nutri_verified_at = coalesce(nutri_verified_at, now()),
    updated_at = now()
  where role = 'nutricionista'
    and (nutri_verification_status is null
         or nutri_verification_status <> 'verified');

comment on column profiles.nutri_verification_status is
  'CRN verification status. Currently bypassed in app code (middleware + auth callback + onboarding-nutri) — value is preserved for when the gate is re-enabled.';
