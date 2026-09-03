begin;

select plan(17);

-- These schema checks run before fixtures so a missing calendar migration is clear.
select ok(to_regclass('public.calendar_events') is not null, 'calendar_events table exists');

select results_eq(
  $$
    select enumlabel
    from pg_enum
    join pg_type on pg_type.oid = pg_enum.enumtypid
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = 'calendar_event_type'
    order by enumsortorder
  $$,
  $$
    values
      ('development'::text),
      ('testing'::text),
      ('bugfix'::text),
      ('meeting'::text),
      ('deadline'::text)
  $$,
  'calendar event types are prescribed'
);

select results_eq(
  $$
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'calendar_events'
    order by ordinal_position
  $$,
  $$
    values
      ('id'::text),
      ('project_id'::text),
      ('title'::text),
      ('event_type'::text),
      ('starts_at'::text),
      ('ends_at'::text),
      ('description'::text),
      ('created_by'::text),
      ('created_at'::text)
  $$,
  'calendar_events has the agreed columns'
);

select ok(
  exists (
    select 1
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'calendar_events'
      and pg_class.relrowsecurity
  ),
  'calendar_events has RLS enabled'
);

select results_eq(
  $$
    select cmd
    from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_events'
    order by cmd
  $$,
  $$
    values
      ('DELETE'::text),
      ('INSERT'::text),
      ('SELECT'::text),
      ('UPDATE'::text)
  $$,
  'calendar_events has policies for each member operation'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_events'
      and cmd = 'INSERT'
      and coalesce(with_check, '') like '%is_project_member%'
      and coalesce(with_check, '') like '%created_by%'
      and coalesce(with_check, '') like '%auth.uid%'
  ),
  'calendar event inserts require project membership and the authenticated creator'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('c1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'calendar-member@example.test', '$2a$10$9x6adV5CqTkmfUN5lGEJcOuXV44QSwDUMHATVPVTGV3mlAWPwTjQe', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('c2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'calendar-outsider@example.test', '$2a$10$9x6adV5CqTkmfUN5lGEJcOuXV44QSwDUMHATVPVTGV3mlAWPwTjQe', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('c3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'calendar-pending@example.test', '$2a$10$9x6adV5CqTkmfUN5lGEJcOuXV44QSwDUMHATVPVTGV3mlAWPwTjQe', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (id, discord_id, username, status)
values
  ('c1111111-1111-4111-8111-111111111111', '11111111111111112', 'calendar_member', 'active'),
  ('c2222222-2222-4222-8222-222222222222', '22222222222222223', 'calendar_outsider', 'active'),
  ('c3333333-3333-4333-8333-333333333333', '33333333333333334', 'calendar_pending', 'pending');

insert into public.projects (id, name, created_by)
values ('c4444444-4444-4444-8444-444444444444', 'Calendar access fixture', 'c1111111-1111-4111-8111-111111111111');

insert into public.project_members (project_id, profile_id, added_by)
values
  ('c4444444-4444-4444-8444-444444444444', 'c1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111'),
  ('c4444444-4444-4444-8444-444444444444', 'c3333333-3333-4333-8333-333333333333', 'c1111111-1111-4111-8111-111111111111');

select set_config('request.jwt.claim.sub', 'c1111111-1111-4111-8111-111111111111', true);
set local role authenticated;

select lives_ok(
  $$
    insert into public.calendar_events (project_id, title, event_type, starts_at, ends_at, created_by)
    values (
      'c4444444-4444-4444-8444-444444444444',
      'Member calendar event',
      'development',
      '2026-09-01 09:00:00+00',
      '2026-09-01 10:00:00+00',
      'c1111111-1111-4111-8111-111111111111'
    )
  $$,
  'an active project member can create a calendar event'
);

select is(
  (select description from public.calendar_events where title = 'Member calendar event'),
  ''::text,
  'calendar event descriptions default to an empty string'
);

select is(
  (select count(*) from public.calendar_events where project_id = 'c4444444-4444-4444-8444-444444444444'),
  1::bigint,
  'an active project member can read project calendar events'
);

select throws_like(
  $$
    insert into public.calendar_events (project_id, title, event_type, starts_at, ends_at, created_by)
    values (
      'c4444444-4444-4444-8444-444444444444',
      repeat('x', 161),
      'testing',
      '2026-09-01 09:00:00+00',
      '2026-09-01 10:00:00+00',
      'c1111111-1111-4111-8111-111111111111'
    )
  $$,
  '%check constraint%',
  'calendar events reject titles longer than 160 characters'
);

select throws_like(
  $$
    insert into public.calendar_events (project_id, title, event_type, starts_at, ends_at, created_by)
    values (
      'c4444444-4444-4444-8444-444444444444',
      'Invalid date range',
      'testing',
      '2026-09-01 10:00:00+00',
      '2026-09-01 09:00:00+00',
      'c1111111-1111-4111-8111-111111111111'
    )
  $$,
  '%check constraint%',
  'calendar events reject an end before their start'
);

select throws_like(
  $$
    insert into public.calendar_events (project_id, title, event_type, starts_at, ends_at, created_by)
    values (
      'c4444444-4444-4444-8444-444444444444',
      'Forged creator',
      'testing',
      '2026-09-01 09:00:00+00',
      '2026-09-01 10:00:00+00',
      'c2222222-2222-4222-8222-222222222222'
    )
  $$,
  '%row-level security%',
  'a member cannot create a calendar event for another user'
);

select throws_like(
  $$
    update public.calendar_events
    set created_by = 'c2222222-2222-4222-8222-222222222222'
    where title = 'Member calendar event'
  $$,
  '%created_by%',
  'calendar event creators cannot be rewritten'
);

select set_config('request.jwt.claim.sub', 'c2222222-2222-4222-8222-222222222222', true);

select is_empty(
  $$
    select 1
    from public.calendar_events
    where project_id = 'c4444444-4444-4444-8444-444444444444'
  $$,
  'an active non-member cannot read project calendar events'
);

select throws_like(
  $$
    insert into public.calendar_events (project_id, title, event_type, starts_at, ends_at, created_by)
    values (
      'c4444444-4444-4444-8444-444444444444',
      'Outsider calendar event',
      'meeting',
      '2026-09-01 09:00:00+00',
      '2026-09-01 10:00:00+00',
      'c2222222-2222-4222-8222-222222222222'
    )
  $$,
  '%row-level security%',
  'an active non-member cannot create a calendar event'
);

select set_config('request.jwt.claim.sub', 'c3333333-3333-4333-8333-333333333333', true);

select is_empty(
  $$
    select 1
    from public.calendar_events
    where project_id = 'c4444444-4444-4444-8444-444444444444'
  $$,
  'a pending project member cannot read project calendar events'
);

select throws_like(
  $$
    insert into public.calendar_events (project_id, title, event_type, starts_at, ends_at, created_by)
    values (
      'c4444444-4444-4444-8444-444444444444',
      'Pending calendar event',
      'deadline',
      '2026-09-01 09:00:00+00',
      '2026-09-01 10:00:00+00',
      'c3333333-3333-4333-8333-333333333333'
    )
  $$,
  '%row-level security%',
  'a pending project member cannot create a calendar event'
);

select * from finish();

rollback;
