begin;

select plan(42);

-- The following relation assertions are intentionally run before fixtures: without
-- the Kanban migration, they fail with a clear missing-schema diagnosis.
select ok(to_regclass('public.projects') is not null, 'projects table exists');
select ok(to_regclass('public.project_members') is not null, 'project_members table exists');
select ok(to_regclass('public.kanban_columns') is not null, 'kanban_columns table exists');
select ok(to_regclass('public.tasks') is not null, 'tasks table exists');
select ok(to_regclass('public.task_assignees') is not null, 'task_assignees table exists');
select ok(to_regclass('public.task_comments') is not null, 'task_comments table exists');
select ok(to_regclass('public.task_attachments') is not null, 'task_attachments table exists');

select results_eq(
  $$
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and (table_name, column_name) in (
        ('project_members', 'added_by'),
        ('task_attachments', 'size_bytes')
      )
    order by table_name, column_name
  $$,
  $$
    values
      ('project_members'::text, 'added_by'::text),
      ('task_attachments'::text, 'size_bytes'::text)
  $$,
  'membership and attachment columns use the agreed names'
);

select results_eq(
  $$
    select name, position
    from public.kanban_columns
    order by position
  $$,
  $$
    values
      ('Backlog'::text, 1000::numeric),
      ('À faire'::text, 2000::numeric),
      ('En cours'::text, 3000::numeric),
      ('À tester'::text, 4000::numeric),
      ('Terminé'::text, 5000::numeric)
  $$,
  'the shared Kanban columns are seeded in their prescribed order'
);

select results_eq(
  $$
    select relname
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where nspname = 'public'
      and relname in ('projects', 'project_members', 'kanban_columns', 'tasks', 'task_assignees', 'task_comments', 'task_attachments')
      and relrowsecurity
    order by relname
  $$,
  $$
    values
      ('kanban_columns'::name),
      ('project_members'::name),
      ('projects'::name),
      ('task_assignees'::name),
      ('task_attachments'::name),
      ('task_comments'::name),
      ('tasks'::name)
  $$,
  'RLS is enabled on every Kanban relation'
);

select ok(
  exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where nspname = 'public'
      and proname = 'is_project_member'
      and proargtypes = '2950'::oidvector
      and prosecdef
      and provolatile = 's'
      and proconfig @> array['search_path=pg_catalog, public']
  ),
  'is_project_member is stable, security-definer, and uses a safe search path'
);

select ok(
  has_function_privilege('authenticated', 'public.is_project_member(uuid)', 'execute'),
  'authenticated users may execute is_project_member'
);

select ok(
  not has_function_privilege('anon', 'public.is_project_member(uuid)', 'execute'),
  'anonymous users cannot execute is_project_member'
);

select ok(
  not exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where nspname = 'public'
      and proname = 'is_project_creator'
  ),
  'there is no permanent project-creator privilege helper'
);

select ok(
  not exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where nspname = 'public'
      and proname = 'can_bootstrap_project_membership'
  ),
  'there is no direct project-membership bootstrap helper'
);

select ok(
  pg_get_functiondef('public.is_project_member(uuid)'::regprocedure) like '%public.profiles%'
  and pg_get_functiondef('public.is_project_member(uuid)'::regprocedure) like '%status = ''active''%',
  'is_project_member requires the caller profile to remain active'
);

select ok(
  exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where nspname = 'public'
      and proname = 'create_task_with_assignees'
      and proargtypes = '2950 2950 25 25 25 1184 2951'::oidvector
      and prosecdef
      and proconfig @> array['search_path=pg_catalog, public']
  ),
  'create_task_with_assignees is security-definer and uses a safe search path'
);

select results_eq(
  $$
    select tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('projects', 'project_members', 'kanban_columns', 'tasks', 'task_assignees', 'task_comments', 'task_attachments')
    group by tablename
    order by tablename
  $$,
  $$
    values
      ('kanban_columns'::name),
      ('project_members'::name),
      ('projects'::name),
      ('task_assignees'::name),
      ('task_attachments'::name),
      ('task_comments'::name),
      ('tasks'::name)
  $$,
  'every Kanban relation has an RLS policy'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'project members read task attachments'
      and qual like '%task_attachments%'
      and qual like '%is_project_member%'
  ),
  'private attachment reads are tied to task project membership'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'task_attachments'
      and policyname = 'uploaders can delete task attachments'
      and cmd = 'DELETE'
      and coalesce(qual, '') like '%uploaded_by%'
      and coalesce(qual, '') like '%auth.uid%'
      and coalesce(qual, '') like '%is_project_member%'
  ),
  'attachment metadata can only be deleted by its uploader while a project member'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'uploaders delete task attachment objects'
      and cmd = 'DELETE'
      and coalesce(qual, '') like '%task_attachments%'
      and coalesce(qual, '') like '%uploaded_by%'
      and coalesce(qual, '') like '%auth.uid%'
      and coalesce(qual, '') like '%is_project_member%'
  ),
  'attachment objects can only be deleted by their uploader while a project member'
);

select ok(
  exists (
    select 1
    from storage.buckets
    where id = 'task-attachments'
      and name = 'task-attachments'
      and public = false
  ),
  'the task attachment bucket exists and is private'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('b1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kanban-owner@example.test', '$2a$10$9x6adV5CqTkmfUN5lGEJcOuXV44QSwDUMHATVPVTGV3mlAWPwTjQe', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kanban-outsider@example.test', '$2a$10$9x6adV5CqTkmfUN5lGEJcOuXV44QSwDUMHATVPVTGV3mlAWPwTjQe', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('b3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kanban-unassigned@example.test', '$2a$10$9x6adV5CqTkmfUN5lGEJcOuXV44QSwDUMHATVPVTGV3mlAWPwTjQe', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('b6666666-6666-4666-8666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kanban-pending@example.test', '$2a$10$9x6adV5CqTkmfUN5lGEJcOuXV44QSwDUMHATVPVTGV3mlAWPwTjQe', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('b7777777-7777-4777-8777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kanban-assignee@example.test', '$2a$10$9x6adV5CqTkmfUN5lGEJcOuXV44QSwDUMHATVPVTGV3mlAWPwTjQe', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (id, discord_id, username, status)
values
  ('b1111111-1111-4111-8111-111111111111', '11111111111111111', 'kanban_owner', 'active'),
  ('b2222222-2222-4222-8222-222222222222', '22222222222222222', 'kanban_outsider', 'active'),
  ('b3333333-3333-4333-8333-333333333333', '33333333333333333', 'kanban_unassigned', 'active'),
  ('b6666666-6666-4666-8666-666666666666', '66666666666666666', 'kanban_pending', 'pending'),
  ('b7777777-7777-4777-8777-777777777777', '77777777777777777', 'kanban_assignee', 'active');

insert into public.projects (id, name, created_by)
values ('b4444444-4444-4444-8444-444444444444', 'Kanban access fixture', 'b1111111-1111-4111-8111-111111111111');

insert into public.project_members (project_id, profile_id, added_by)
values
  ('b4444444-4444-4444-8444-444444444444', 'b1111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-111111111111'),
  ('b4444444-4444-4444-8444-444444444444', 'b7777777-7777-4777-8777-777777777777', 'b1111111-1111-4111-8111-111111111111');

select set_config('request.jwt.claim.sub', 'b1111111-1111-4111-8111-111111111111', true);
set local role authenticated;

select ok(
  public.is_project_member('b4444444-4444-4444-8444-444444444444'),
  'a project member is recognized under the authenticated role'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and cmd = 'INSERT'
  ),
  'projects have no direct INSERT policy outside the atomic RPC'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'project_members'
      and policyname = 'members can add project memberships'
      and coalesce(with_check, '') like '%is_active_member%'
      and coalesce(with_check, '') like '%profiles%'
      and coalesce(with_check, '') like '%status%'
  ),
  'membership inserts require active callers and active target profiles'
);

select ok(
  has_function_privilege('authenticated', 'public.create_project_with_creator(text, text, text, date, date)', 'execute'),
  'authenticated users may create a project through the atomic RPC'
);

select ok(
  not has_function_privilege('anon', 'public.create_project_with_creator(text, text, text, date, date)', 'execute'),
  'anonymous users cannot execute the project-creation RPC'
);

select ok(
  has_function_privilege('authenticated', 'public.create_task_with_assignees(uuid, uuid, text, text, text, timestamptz, uuid[])', 'execute'),
  'authenticated users may create a task through the atomic RPC'
);

select ok(
  not has_function_privilege('anon', 'public.create_task_with_assignees(uuid, uuid, text, text, text, timestamptz, uuid[])', 'execute'),
  'anonymous users cannot execute the task-creation RPC'
);

select throws_like(
  $$
    insert into public.projects (id, name, created_by)
    values (
      'b5555555-5555-4555-8555-555555555555',
      'Direct creation must fail',
      'b1111111-1111-4111-8111-111111111111'
    )
  $$,
  '%row-level security%',
  'an active member cannot create a project directly'
);

select lives_ok(
  $$
    select public.create_project_with_creator(
      'Atomic project fixture',
      '',
      '#6D4AFF',
      null,
      null
    )
  $$,
  'an active member creates a project and membership through the RPC'
);

select is(
  (
    select count(*)
    from public.projects
    join public.project_members on project_members.project_id = projects.id
    where projects.name = 'Atomic project fixture'
      and project_members.profile_id = 'b1111111-1111-4111-8111-111111111111'
  ),
  1::bigint,
  'the RPC creates the creator membership atomically'
);

select throws_like(
  $$
    insert into public.project_members (project_id, profile_id, added_by)
    values (
      'b4444444-4444-4444-8444-444444444444',
      'b6666666-6666-4666-8666-666666666666',
      'b1111111-1111-4111-8111-111111111111'
    )
  $$,
  '%row-level security%',
  'a project member cannot add a pending profile through REST'
);

select lives_ok(
  $$
    select public.create_task_with_assignees(
      'b4444444-4444-4444-8444-444444444444',
      (select id from public.kanban_columns where position = 1000),
      'Atomic task fixture',
      '',
      '#6D4AFF',
      null,
      array['b7777777-7777-4777-8777-777777777777'::uuid]
    )
  $$,
  'an active project member creates a task and assignee through the RPC'
);

select is(
  (
    select count(*)
    from public.tasks
    join public.task_assignees on task_assignees.task_id = tasks.id
    where tasks.title = 'Atomic task fixture'
      and task_assignees.profile_id = 'b7777777-7777-4777-8777-777777777777'
  ),
  1::bigint,
  'the task RPC creates its assignees atomically'
);

select throws_like(
  $$
    select public.create_task_with_assignees(
      'b4444444-4444-4444-8444-444444444444',
      (select id from public.kanban_columns where position = 1000),
      'Rejected atomic task fixture',
      '',
      '#6D4AFF',
      null,
      array['b3333333-3333-4333-8333-333333333333'::uuid]
    )
  $$,
  '%task creation is not allowed%',
  'the task RPC rejects an assignee outside the project'
);

select is(
  (select count(*) from public.tasks where title = 'Rejected atomic task fixture'),
  0::bigint,
  'a rejected assignee leaves no task behind'
);

select lives_ok(
  $$
    insert into public.tasks (project_id, column_id, title, created_by)
    select
      'b4444444-4444-4444-8444-444444444444',
      id,
      'Membership-protected task',
      'b1111111-1111-4111-8111-111111111111'
    from public.kanban_columns
    where position = 1000
  $$,
  'a project member can create a task'
);

select throws_like(
  $$
    insert into public.task_assignees (task_id, profile_id)
    select id, 'b3333333-3333-4333-8333-333333333333'
    from public.tasks
    where title = 'Membership-protected task'
  $$,
  '%row-level security%',
  'a task cannot be assigned to someone outside its project'
);

reset role;
update public.profiles
set status = 'pending'
where id = 'b1111111-1111-4111-8111-111111111111';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1111111-1111-4111-8111-111111111111', true);

select ok(
  not public.is_project_member('b4444444-4444-4444-8444-444444444444'),
  'a member reverted to pending is no longer recognized as a project member'
);

select is_empty(
  $$
    select 1
    from public.tasks
    where project_id = 'b4444444-4444-4444-8444-444444444444'
  $$,
  'a member reverted to pending cannot read project tasks'
);

select set_config('request.jwt.claim.sub', 'b2222222-2222-4222-8222-222222222222', true);

select is_empty(
  $$
    select 1
    from public.tasks
    where project_id = 'b4444444-4444-4444-8444-444444444444'
  $$,
  'an active non-member cannot read a project task'
);

-- Real local scenarios to run alongside this pgTAP file:
-- 1. In two browser sessions, create a project as A through the RPC,
--    then verify B cannot open its tasks, comments, attachments, or storage object.
-- 2. Add B as a member and verify B can create, move, comment on, and attach
--    metadata to a task; remove B and verify each operation is denied again.
-- 3. Attempt to assign a non-member to a task and confirm the insert is denied.

select * from finish();

rollback;
