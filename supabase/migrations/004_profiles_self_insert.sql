-- Allow authenticated users to insert their own profile row (e.g. upsert from onboarding if trigger missed)
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);
