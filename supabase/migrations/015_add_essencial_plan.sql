-- Add 'essencial' plan tier (mid-tier consumer plan: R$29/mo, all features with monthly limits)
-- B2B2C strategy: free → essencial (R$29) → pro (R$59) for consumers; nutri_pro for nutricionistas at R$249/mo.

alter table profiles drop constraint if exists profiles_plan_check;

alter table profiles
  add constraint profiles_plan_check
  check (plan in ('free','essencial','pro','nutri_pro'));
