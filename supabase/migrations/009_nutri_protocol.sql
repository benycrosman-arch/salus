-- ═══════════════════════════════════════════════════════════════
-- NUTRICIONISTA — protocolo livre + plan default
-- O role/plan já existem em 001. Aqui adicionamos o paragrafo de protocolo
-- e ajustamos o plan default quando alguém escolhe "nutricionista" no onboarding.
-- ═══════════════════════════════════════════════════════════════

alter table profiles
  add column if not exists nutri_protocol text check (length(coalesce(nutri_protocol, '')) <= 4000);

-- Onboarding flag: completed_at also tells us *when* (used to detect re-onboarding)
alter table profiles
  add column if not exists onboarding_completed_at timestamptz;

-- Helper view: nutricionistas com contagem de pacientes ativos
create or replace view nutri_overview as
select
  p.id,
  p.name,
  p.email,
  p.nutri_protocol,
  p.created_at,
  count(distinct l.patient_id) filter (where l.status = 'active') as active_patients
from profiles p
left join nutri_patient_links l on l.nutri_id = p.id
where p.role = 'nutricionista'
group by p.id;

revoke all on nutri_overview from anon;
grant select on nutri_overview to authenticated, service_role;
