create type public.member_status as enum ('pending', 'active');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text unique not null check (discord_id ~ '^[0-9]{5,32}$'),
  username text not null,
  display_name text,
  avatar_url text,
  status public.member_status not null default 'pending',
  activated_at timestamptz,
  activated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and status = 'active'
  );
$$;

alter table public.profiles enable row level security;

create policy "Active members can view profiles"
on public.profiles
for select
to authenticated
using (public.is_active_member());

revoke all on function public.is_active_member() from public;
grant execute on function public.is_active_member() to authenticated;
