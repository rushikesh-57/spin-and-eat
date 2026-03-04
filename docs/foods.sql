create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  food_name text not null,
  category text not null check (category in ('breakfast', 'lunch', 'dinner', 'snacks')),
  created_at timestamptz not null default now()
);

alter table public.foods enable row level security;

create policy "foods_owner_access" on public.foods
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
