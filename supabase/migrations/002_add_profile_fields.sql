-- Add age and activity_level to profiles (not included in initial schema)
alter table profiles
  add column if not exists age integer,
  add column if not exists activity_level text check (activity_level in ('sedentary','moderate','active','athlete'));
