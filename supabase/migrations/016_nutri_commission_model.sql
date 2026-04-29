-- Shift from "nutricionista pays R$249/mo" to "nutricionista earns commission on referred patients."
-- Nutris keep full Pro access via their `role`; the paid plan tier 'nutri_pro' is no longer marketed
-- (kept in the check constraint for backwards-compat with any legacy rows).

-- ============================================================
-- 1. Per-link commission rate override
-- ============================================================
alter table nutri_patient_links
  add column if not exists commission_rate numeric(5,4) default 0.30
    check (commission_rate >= 0 and commission_rate <= 1);

comment on column nutri_patient_links.commission_rate is
  'Fraction of patient subscription revenue paid back to the nutri (default 30%).';

-- ============================================================
-- 2. Commission ledger
-- ============================================================
-- One row per (nutri, patient, period). Active periods have ended_at = null.
-- Closed when patient cancels, switches plan, or the nutri_patient_link ends.
create table if not exists nutri_commissions (
  id uuid primary key default gen_random_uuid(),
  nutri_id uuid references profiles(id) on delete cascade not null,
  patient_id uuid references profiles(id) on delete cascade not null,
  patient_plan text not null check (patient_plan in ('essencial','pro')),
  patient_monthly_brl numeric(10,2) not null,
  commission_rate numeric(5,4) not null,
  commission_brl numeric(10,2) generated always as (round(patient_monthly_brl * commission_rate, 2)) stored,
  source_event text,                                          -- e.g. 'rc:INITIAL_PURCHASE', 'rc:PRODUCT_CHANGE'
  rc_product_id text,                                         -- attribution to RC product
  started_at timestamptz default now() not null,
  ended_at timestamptz,                                       -- null = currently accruing
  paid_out_at timestamptz,                                    -- null = unpaid (payouts are out of scope here)
  created_at timestamptz default now() not null
);

create index if not exists idx_nutri_commissions_nutri_active
  on nutri_commissions(nutri_id, started_at desc)
  where ended_at is null;

create index if not exists idx_nutri_commissions_patient_active
  on nutri_commissions(patient_id, started_at desc)
  where ended_at is null;

alter table nutri_commissions enable row level security;

-- Nutri can read their own commissions; patient can read theirs (transparency).
drop policy if exists "Nutri reads own commissions" on nutri_commissions;
create policy "Nutri reads own commissions" on nutri_commissions
  for select using (auth.uid() = nutri_id);

drop policy if exists "Patient reads own commissions" on nutri_commissions;
create policy "Patient reads own commissions" on nutri_commissions
  for select using (auth.uid() = patient_id);

-- Inserts/updates only via service role (the RevenueCat webhook); no direct client writes.
-- (No insert/update policy on purpose.)

-- ============================================================
-- 3. Helper: monthly commission earnings per nutri (current month, active)
-- ============================================================
create or replace view nutri_monthly_earnings as
select
  nutri_id,
  count(*) filter (where ended_at is null) as active_referrals,
  coalesce(sum(commission_brl) filter (where ended_at is null), 0) as monthly_brl
from nutri_commissions
group by nutri_id;
