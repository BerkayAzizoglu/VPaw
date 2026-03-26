create table if not exists public.pet_profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, pet_id)
);

alter table public.pet_profiles
  drop constraint if exists pet_profiles_pet_id_check;

alter table public.pet_profiles enable row level security;

drop policy if exists pet_profiles_select_own on public.pet_profiles;
create policy pet_profiles_select_own
  on public.pet_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists pet_profiles_insert_own on public.pet_profiles;
create policy pet_profiles_insert_own
  on public.pet_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists pet_profiles_update_own on public.pet_profiles;
create policy pet_profiles_update_own
  on public.pet_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
