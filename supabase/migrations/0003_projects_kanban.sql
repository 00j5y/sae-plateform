create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '',
  color text not null default '#6D4AFF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  starts_on date,
  ends_on date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);

create table public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 100),
  position numeric not null unique check (position >= 0),
  created_at timestamptz not null default now()
);

insert into public.kanban_columns (name, position)
values
  ('Backlog', 1000),
  ('À faire', 2000),
  ('En cours', 3000),
  ('À tester', 4000),
  ('Terminé', 5000);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  column_id uuid not null references public.kanban_columns(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  color text not null default '#6D4AFF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  due_at timestamptz,
  position numeric not null default 1000 check (position >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_project_column_position_idx
  on public.tasks (project_id, column_id, position);

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create table public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, profile_id)
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index task_comments_task_created_at_idx
  on public.task_comments (task_id, created_at);

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  path text not null unique check (char_length(path) between 1 and 1024),
  filename text not null check (char_length(filename) between 1 and 255),
  mime_type text not null check (char_length(mime_type) between 1 and 255),
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index task_attachments_task_created_at_idx
  on public.task_attachments (task_id, created_at);

create or replace function public.is_project_member(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.project_members
    join public.profiles on profiles.id = project_members.profile_id
    where project_id = target_project_id
      and profile_id = (select auth.uid())
      and profiles.status = 'active'
  );
$$;

revoke all on function public.is_project_member(uuid) from public;
grant execute on function public.is_project_member(uuid) to authenticated;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.kanban_columns enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;

create policy "project members can read projects"
on public.projects for select to authenticated
using (public.is_project_member(id));

create policy "project members can update projects"
on public.projects for update to authenticated
using (public.is_project_member(id))
with check (public.is_project_member(id));

create policy "project members can delete projects"
on public.projects for delete to authenticated
using (public.is_project_member(id));

create policy "project members can read memberships"
on public.project_members for select to authenticated
using (public.is_project_member(project_id));

create policy "members can add project memberships"
on public.project_members for insert to authenticated
with check (
  public.is_project_member(project_id)
  and public.is_active_member()
  and exists (
    select 1
    from public.profiles
    where profiles.id = project_members.profile_id
      and profiles.status = 'active'
  )
);

create policy "project members can update memberships"
on public.project_members for update to authenticated
using (public.is_project_member(project_id))
with check (
  public.is_project_member(project_id)
  and exists (
    select 1
    from public.profiles
    where profiles.id = project_members.profile_id
      and profiles.status = 'active'
  )
);

create policy "project members can delete memberships"
on public.project_members for delete to authenticated
using (public.is_project_member(project_id));

create policy "active members can read Kanban columns"
on public.kanban_columns for select to authenticated
using (public.is_active_member());

create policy "active members can create Kanban columns"
on public.kanban_columns for insert to authenticated
with check (public.is_active_member());

create policy "active members can update Kanban columns"
on public.kanban_columns for update to authenticated
using (public.is_active_member())
with check (public.is_active_member());

create policy "active members can delete Kanban columns"
on public.kanban_columns for delete to authenticated
using (public.is_active_member());

create policy "project members can read tasks"
on public.tasks for select to authenticated
using (public.is_project_member(project_id));

create policy "project members can create tasks"
on public.tasks for insert to authenticated
with check (
  public.is_project_member(project_id)
  and created_by = (select auth.uid())
);

create policy "project members can update tasks"
on public.tasks for update to authenticated
using (public.is_project_member(project_id))
with check (public.is_project_member(project_id));

create policy "project members can delete tasks"
on public.tasks for delete to authenticated
using (public.is_project_member(project_id));

create policy "project members can read task assignees"
on public.task_assignees for select to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_id
      and public.is_project_member(tasks.project_id)
  )
);

create policy "project members can assign task members"
on public.task_assignees for insert to authenticated
with check (
  exists (
    select 1
    from public.tasks
    join public.project_members on project_members.project_id = tasks.project_id
    where tasks.id = task_id
      and project_members.profile_id = task_assignees.profile_id
      and public.is_project_member(tasks.project_id)
  )
);

create policy "project members can update task assignees"
on public.task_assignees for update to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_id
      and public.is_project_member(tasks.project_id)
  )
)
with check (
  exists (
    select 1
    from public.tasks
    join public.project_members on project_members.project_id = tasks.project_id
    where tasks.id = task_id
      and project_members.profile_id = task_assignees.profile_id
      and public.is_project_member(tasks.project_id)
  )
);

create policy "project members can remove task assignees"
on public.task_assignees for delete to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_id
      and public.is_project_member(tasks.project_id)
  )
);

create policy "project members can read task comments"
on public.task_comments for select to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_id
      and public.is_project_member(tasks.project_id)
  )
);

create policy "project members can create task comments"
on public.task_comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.tasks
    where tasks.id = task_id
      and public.is_project_member(tasks.project_id)
  )
);

create policy "project members can update task comments"
on public.task_comments for update to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_id
      and public.is_project_member(tasks.project_id)
  )
)
with check (
  exists (
    select 1
    from public.tasks
    join public.project_members on project_members.project_id = tasks.project_id
    where tasks.id = task_id
      and project_members.profile_id = task_comments.author_id
      and public.is_project_member(tasks.project_id)
  )
);

create policy "project members can delete task comments"
on public.task_comments for delete to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_id
      and public.is_project_member(tasks.project_id)
  )
);

create policy "project members can read task attachments"
on public.task_attachments for select to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_id
      and public.is_project_member(tasks.project_id)
  )
);

create policy "project members can create task attachments"
on public.task_attachments for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and exists (
    select 1 from public.tasks
    where tasks.id = task_id
      and public.is_project_member(tasks.project_id)
  )
);

create policy "project members can update task attachments"
on public.task_attachments for update to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_id
      and public.is_project_member(tasks.project_id)
  )
)
with check (
  exists (
    select 1
    from public.tasks
    join public.project_members on project_members.project_id = tasks.project_id
    where tasks.id = task_id
      and project_members.profile_id = task_attachments.uploaded_by
      and public.is_project_member(tasks.project_id)
  )
);

create policy "project members can delete task attachments"
on public.task_attachments for delete to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_id
      and public.is_project_member(tasks.project_id)
  )
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments', 'task-attachments', false, 52428800)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "active members can read permitted task files" on storage.objects;

create policy "project members read task attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'task-attachments'
  and exists (
    select 1
    from public.task_attachments attachments
    join public.tasks on tasks.id = attachments.task_id
    where attachments.path = name
      and public.is_project_member(tasks.project_id)
  )
);

create or replace function public.create_project_with_creator(
  p_name text,
  p_description text,
  p_color text,
  p_starts_on date,
  p_ends_on date
)
returns public.projects
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_profile_id uuid := auth.uid();
  created_project public.projects;
begin
  if current_profile_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = current_profile_id
      and status = 'active'
  ) then
    raise exception 'active membership required';
  end if;

  if p_name is null or char_length(trim(p_name)) not between 1 and 100 then
    raise exception 'invalid project name';
  end if;

  if p_description is null or char_length(p_description) > 10000 then
    raise exception 'invalid project description';
  end if;

  if p_color is null or p_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'invalid project color';
  end if;

  if p_starts_on is not null and p_ends_on is not null and p_ends_on < p_starts_on then
    raise exception 'invalid project dates';
  end if;

  insert into public.projects (name, description, color, starts_on, ends_on, created_by)
  values (trim(p_name), p_description, p_color, p_starts_on, p_ends_on, current_profile_id)
  returning * into created_project;

  insert into public.project_members (project_id, profile_id, added_by)
  values (created_project.id, current_profile_id, current_profile_id);

  return created_project;
end;
$$;

revoke all on function public.create_project_with_creator(text, text, text, date, date) from public;
grant execute on function public.create_project_with_creator(text, text, text, date, date) to authenticated;

create or replace function public.create_task_with_assignees(
  p_project_id uuid,
  p_column_id uuid,
  p_title text,
  p_description text,
  p_color text,
  p_due_at timestamptz,
  p_assignee_ids uuid[]
)
returns public.tasks
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_profile_id uuid := auth.uid();
  created_task public.tasks;
  task_position numeric;
begin
  if current_profile_id is null then
    raise exception 'task creation is not allowed';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = current_profile_id
      and status = 'active'
  ) then
    raise exception 'task creation is not allowed';
  end if;

  if not exists (
    select 1
    from public.project_members
    join public.profiles on profiles.id = project_members.profile_id
    where project_members.project_id = p_project_id
      and project_members.profile_id = current_profile_id
      and profiles.status = 'active'
  ) then
    raise exception 'task creation is not allowed';
  end if;

  if not exists (
    select 1
    from public.kanban_columns
    where id = p_column_id
  ) then
    raise exception 'task creation is not allowed';
  end if;

  if p_title is null or char_length(trim(p_title)) not between 1 and 160 then
    raise exception 'task creation is not allowed';
  end if;

  if p_description is null or char_length(p_description) > 10000 then
    raise exception 'task creation is not allowed';
  end if;

  if p_color is null or p_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'task creation is not allowed';
  end if;

  p_assignee_ids := coalesce(p_assignee_ids, array[]::uuid[]);

  if coalesce(array_length(p_assignee_ids, 1), 0) <> (
    select count(distinct profile_id)
    from unnest(p_assignee_ids) as requested(profile_id)
  ) then
    raise exception 'task creation is not allowed';
  end if;

  if coalesce(array_length(p_assignee_ids, 1), 0) <> (
    select count(*)
    from unnest(p_assignee_ids) as requested(profile_id)
    join public.project_members on project_members.project_id = p_project_id
      and project_members.profile_id = requested.profile_id
    join public.profiles on profiles.id = requested.profile_id
      and profiles.status = 'active'
  ) then
    raise exception 'task creation is not allowed';
  end if;

  select coalesce(max(position), 0) + 1000
  into task_position
  from public.tasks
  where project_id = p_project_id
    and column_id = p_column_id;

  insert into public.tasks (
    project_id,
    column_id,
    title,
    description,
    color,
    due_at,
    position,
    created_by
  )
  values (
    p_project_id,
    p_column_id,
    trim(p_title),
    p_description,
    p_color,
    p_due_at,
    task_position,
    current_profile_id
  )
  returning * into created_task;

  insert into public.task_assignees (task_id, profile_id)
  select created_task.id, requested.profile_id
  from unnest(p_assignee_ids) as requested(profile_id);

  return created_task;
end;
$$;

revoke all on function public.create_task_with_assignees(uuid, uuid, text, text, text, timestamptz, uuid[]) from public;
grant execute on function public.create_task_with_assignees(uuid, uuid, text, text, text, timestamptz, uuid[]) to authenticated;
