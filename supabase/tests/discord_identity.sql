begin;

select plan(3);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  'a1111111-1111-4111-8111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'discord-identity-test@example.test',
  '$2a$10$9x6adV5CqTkmfUN5lGEJcOuXV44QSwDUMHATVPVTGV3mlAWPwTjQe',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);

insert into public.profiles (id, discord_id, username, display_name, avatar_url, status)
values (
  'a1111111-1111-4111-8111-111111111111',
  '12345678901234567',
  'original_user',
  'Original user',
  'https://cdn.discordapp.com/avatars/1/original.png',
  'active'
);

select throws_like(
  $$
    update public.profiles
    set discord_id = '76543210987654321'
    where id = 'a1111111-1111-4111-8111-111111111111'
  $$,
  'discord_id cannot be changed',
  'changing a Discord identifier is rejected'
);

select lives_ok(
  $$
    update public.profiles
    set
      username = 'refreshed_user',
      display_name = 'Refreshed user',
      avatar_url = 'https://media.discordapp.net/avatars/1/refreshed.png'
    where id = 'a1111111-1111-4111-8111-111111111111'
  $$,
  'Discord profile metadata can be refreshed'
);

select results_eq(
  $$
    select username, display_name, avatar_url
    from public.profiles
    where id = 'a1111111-1111-4111-8111-111111111111'
  $$,
  $$
    values (
      'refreshed_user'::text,
      'Refreshed user'::text,
      'https://media.discordapp.net/avatars/1/refreshed.png'::text
    )
  $$,
  'username, display name, and avatar persist after refresh'
);

select * from finish();

rollback;
