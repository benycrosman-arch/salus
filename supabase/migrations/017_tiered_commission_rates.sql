-- Tiered commission rates: more active patients → higher commission.
-- 1 patient = 5%, then +1% per patient up to 5, 10% for 6-10, 12% for 11+.
-- The rate is a function of the nutri's current active referral count, applied
-- across ALL of their active commissions — so when patient #5 joins, the prior
-- four also tick up from 8% to 9%.

create or replace function nutri_commission_rate(active_count int)
returns numeric
language sql
immutable
as $$
  select case
    when active_count <= 0 then 0::numeric
    when active_count = 1 then 0.05
    when active_count = 2 then 0.06
    when active_count = 3 then 0.07
    when active_count = 4 then 0.08
    when active_count = 5 then 0.09
    when active_count between 6 and 10 then 0.10
    else 0.12
  end;
$$;

comment on function nutri_commission_rate(int) is
  'Tiered nutri commission ladder: 5% at 1 patient, +1%/patient up to 9% at 5, 10% for 6-10, 12% for 11+.';

-- Earnings view recomputes per nutri using the current active count.
-- Drop + recreate so we can reshape columns safely.
drop view if exists nutri_monthly_earnings;

create view nutri_monthly_earnings as
with active as (
  select
    nutri_id,
    count(*)::int as active_count,
    coalesce(sum(patient_monthly_brl), 0) as monthly_revenue_brl
  from nutri_commissions
  where ended_at is null
  group by nutri_id
)
select
  nutri_id,
  active_count as active_referrals,
  nutri_commission_rate(active_count) as commission_rate,
  round(monthly_revenue_brl * nutri_commission_rate(active_count), 2) as monthly_brl,
  monthly_revenue_brl as patient_revenue_brl
from active;

-- Per-nutri active count helper (used by the commission writer to snapshot the
-- rate at write time). The view above is the source of truth for current
-- earnings; this helper just lets server code know what bracket the next row
-- should record.
create or replace function nutri_active_referrals(p_nutri_id uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from nutri_commissions
  where nutri_id = p_nutri_id and ended_at is null;
$$;
