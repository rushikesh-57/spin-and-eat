create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_name text not null default '',
  city text not null default '',
  diet_preference text not null default 'no-preference',
  spice_preference text not null default 'medium',
  family_members integer not null default 2 check (family_members >= 1),
  whatsapp_number text not null default '',
  setup_status text null check (setup_status in ('skipped', 'completed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_profiles
add column if not exists whatsapp_number text not null default '';

alter table public.user_profiles enable row level security;

create policy "Users can view their own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_user_profiles_updated_at();
