create table if not exists public.groceries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  ordered_quantity double precision not null default 0,
  remaining_quantity double precision not null default 0,
  unit text not null,
  status text not null check (status in ('available', 'low', 'out')),
  created_at timestamptz not null default now()
);

alter table public.groceries
  add column if not exists ordered_quantity double precision not null default 0,
  add column if not exists remaining_quantity double precision not null default 0;

alter table public.groceries enable row level security;

drop policy if exists "groceries_owner_access" on public.groceries;

create policy "groceries_owner_access" on public.groceries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
