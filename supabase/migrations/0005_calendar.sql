create type public.calendar_event_type as enum (
  'development',
  'testing',
  'bugfix',
  'meeting',
  'deadline'
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  event_type public.calendar_event_type not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  description text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);

create or replace function public.prevent_calendar_event_creator_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'calendar event created_by cannot be changed';
  end if;

  return new;
end;
$$;

create trigger calendar_events_prevent_creator_change
before update of created_by on public.calendar_events
for each row execute function public.prevent_calendar_event_creator_change();

alter table public.calendar_events enable row level security;

create policy "project members can read calendar events"
on public.calendar_events for select to authenticated
using (public.is_project_member(project_id));

create policy "project members can create calendar events"
on public.calendar_events for insert to authenticated
with check (
  public.is_project_member(project_id)
  and created_by = (select auth.uid())
);

create policy "project members can update calendar events"
on public.calendar_events for update to authenticated
using (public.is_project_member(project_id))
with check (public.is_project_member(project_id));

create policy "project members can delete calendar events"
on public.calendar_events for delete to authenticated
using (public.is_project_member(project_id));
