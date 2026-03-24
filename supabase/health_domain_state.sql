create table if not exists public.health_domain_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, pet_id)
);

alter table public.health_domain_state enable row level security;

drop policy if exists health_domain_state_select_own on public.health_domain_state;
create policy health_domain_state_select_own
  on public.health_domain_state
  for select
  using (auth.uid() = user_id);

drop policy if exists health_domain_state_insert_own on public.health_domain_state;
create policy health_domain_state_insert_own
  on public.health_domain_state
  for insert
  with check (auth.uid() = user_id);

drop policy if exists health_domain_state_update_own on public.health_domain_state;
create policy health_domain_state_update_own
  on public.health_domain_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
