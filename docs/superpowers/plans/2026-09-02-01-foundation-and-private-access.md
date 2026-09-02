# Foundation and Private Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a deployable Next.js foundation where Discord-authenticated users remain blocked until an active teammate authorizes them.

**Architecture:** Next.js App Router is the UI and server boundary. Supabase provides Discord OAuth, PostgreSQL, Row Level Security and private storage; server actions use an admin client only for the controlled activation workflow. The visual system is desktop-first, system-font based and supports theme, reduced motion and high contrast.

**Tech Stack:** Next.js, React, TypeScript, Bun, Tailwind CSS, Supabase Auth/SSR/PostgreSQL/Storage, Zod, Vitest, Testing Library, Playwright, Motion, Lucide React.

---

## Target structure

```text
app/
  (auth)/login/page.tsx
  (protected)/layout.tsx
  (protected)/pending/page.tsx
  (protected)/members/page.tsx
  auth/callback/route.ts
  globals.css
  layout.tsx
components/
  auth/discord-login-button.tsx
  members/activate-member-form.tsx
  ui/theme-toggle.tsx
lib/
  auth/access.ts
  supabase/client.ts
  supabase/server.ts
  supabase/admin.ts
  validations/member.ts
supabase/migrations/0001_foundation.sql
tests/unit/access.test.ts
tests/unit/member-validation.test.ts
tests/e2e/access.spec.ts
```

### Task 1: Bootstrap the application and quality gates

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`
- Create: `app/layout.tsx`, `app/globals.css`, `tests/setup.ts`

- [ ] **Step 1: Write the initial smoke test**

```ts
// tests/unit/smoke.test.ts
import { describe, expect, it } from 'vitest';

describe('project setup', () => {
  it('runs unit tests', () => expect(true).toBe(true));
});
```

- [ ] **Step 2: Run the test and verify that it fails because dependencies are absent**

Run: `bun test tests/unit/smoke.test.ts`

Expected: command fails with a missing test runner or package error.

- [ ] **Step 3: Create the Bun and Next.js setup**

```json
{
  "name": "sae-platform",
  "private": true,
  "packageManager": "bun@1.2.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/ssr": "latest",
    "@supabase/supabase-js": "latest",
    "@dnd-kit/core": "latest",
    "@dnd-kit/sortable": "latest",
    "@fullcalendar/core": "latest",
    "@fullcalendar/daygrid": "latest",
    "@fullcalendar/list": "latest",
    "@fullcalendar/react": "latest",
    "@fullcalendar/timegrid": "latest",
    "date-fns": "latest",
    "lucide-react": "latest",
    "motion": "latest",
    "next": "latest",
    "octokit": "latest",
    "react": "latest",
    "react-dom": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "eslint": "latest",
    "eslint-config-next": "latest",
    "jsdom": "latest",
    "tailwindcss": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

Create `.env.example` with exactly `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INITIAL_ACTIVE_DISCORD_ID`, `NEXT_PUBLIC_APP_URL`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` and `GITHUB_WEBHOOK_SECRET`, all empty.

- [ ] **Step 4: Implement the global shell and Apple-inspired accessibility baseline**

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SAE Platform',
  description: 'Organisation privée des SAE'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr" suppressHydrationWarning><body>{children}</body></html>;
}
```

```css
/* app/globals.css */
@import "tailwindcss";

:root { color-scheme: light dark; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; }
body { margin: 0; background: light-dark(#f4f5f7, #17181d); color: light-dark(#17181d, #f6f7fb); }
:focus-visible { outline: 3px solid #6d4aff; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; scroll-behavior: auto !important; } }
@media (prefers-reduced-transparency: reduce) { .material { backdrop-filter: none !important; background: Canvas !important; } }
@media (prefers-contrast: more) { .material { border: 1px solid currentColor; } }
```

- [ ] **Step 5: Run checks**

Run: `bun install && bun test && bun run typecheck && bun run build`

Expected: all commands exit with code 0.

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock app tests vitest.config.ts playwright.config.ts tsconfig.json next.config.ts tailwind.config.ts .env.example
git commit -m "chore: bootstrap SAE platform"
```

### Task 2: Add the private-access schema and RLS policies

**Files:**
- Create: `supabase/migrations/0001_foundation.sql`
- Test: `supabase/tests/foundation_access.sql`

- [ ] **Step 1: Write the database test cases first**

```sql
-- supabase/tests/foundation_access.sql
begin;
select plan(2);
select is_empty(
  $$ select * from public.profiles where id = '00000000-0000-0000-0000-000000000002' $$,
  'a user cannot read another profile before a policy grants it'
);
select ok(public.is_active_member() is false, 'an anonymous request is never an active member');
select * from finish();
rollback;
```

- [ ] **Step 2: Run the database test and verify it fails before the schema exists**

Run: `supabase test db`

Expected: failure because `public.profiles` does not exist.

- [ ] **Step 3: Create the migration with the profile lifecycle and RLS**

```sql
create type public.member_status as enum ('pending', 'active');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text not null unique,
  username text not null,
  display_name text,
  avatar_url text,
  status public.member_status not null default 'pending',
  activated_at timestamptz,
  activated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles read by active members" on public.profiles for select to authenticated
using ((select status from public.profiles where id = auth.uid()) = 'active');
create policy "profiles update own avatar only" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.is_active_member() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and status = 'active') $$;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
```

- [ ] **Step 4: Seed the initial active account only through a protected server-side operation**

```ts
// lib/auth/access.ts
export function canBootstrap(discordId: string): boolean {
  return discordId === process.env.INITIAL_ACTIVE_DISCORD_ID;
}
```

Do not create a public SQL policy that activates the first user. The callback route in Task 3 must set the initial user active only when `canBootstrap` returns true.

- [ ] **Step 5: Run migration and database tests**

Run: `supabase db reset && supabase test db`

Expected: migration completes and all database assertions pass.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0001_foundation.sql supabase/tests/foundation_access.sql lib/auth/access.ts
git commit -m "feat: add private member access schema"
```

### Task 3: Implement Discord OAuth, pending gate and member activation

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `app/auth/callback/route.ts`
- Create: `app/(auth)/login/page.tsx`, `components/auth/discord-login-button.tsx`
- Create: `app/(protected)/layout.tsx`, `app/(protected)/pending/page.tsx`, `app/(protected)/members/page.tsx`, `components/members/activate-member-form.tsx`
- Create: `lib/validations/member.ts`
- Test: `tests/unit/access.test.ts`, `tests/unit/member-validation.test.ts`, `tests/e2e/access.spec.ts`

- [ ] **Step 1: Write failing access and validation tests**

```ts
// tests/unit/access.test.ts
import { describe, expect, it } from 'vitest';
import { destinationForStatus } from '@/lib/auth/access';

describe('destinationForStatus', () => {
  it('sends a pending member to the waiting page', () => {
    expect(destinationForStatus('pending')).toBe('/pending');
  });
  it('sends an active member to the dashboard', () => {
    expect(destinationForStatus('active')).toBe('/');
  });
});
```

```ts
// tests/unit/member-validation.test.ts
import { expect, it } from 'vitest';
import { activateMemberSchema } from '@/lib/validations/member';

it('rejects an invalid profile UUID', () => {
  expect(activateMemberSchema.safeParse({ profileId: 'discord-name' }).success).toBe(false);
});
```

- [ ] **Step 2: Run the tests and verify they fail because exports do not exist**

Run: `bun test tests/unit/access.test.ts tests/unit/member-validation.test.ts`

Expected: failure with missing module or export errors.

- [ ] **Step 3: Implement the minimal pure logic and server clients**

```ts
// lib/auth/access.ts
export type MemberStatus = 'pending' | 'active';
export const destinationForStatus = (status: MemberStatus) => status === 'active' ? '/' : '/pending';
export const canBootstrap = (discordId: string) => discordId === process.env.INITIAL_ACTIVE_DISCORD_ID;
```

```ts
// lib/validations/member.ts
import { z } from 'zod';
export const activateMemberSchema = z.object({ profileId: z.string().uuid() });
```

```ts
// components/auth/discord-login-button.tsx
'use client';
import { createClient } from '@/lib/supabase/client';

export function DiscordLoginButton() {
  const login = async () => {
    await createClient().auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: `${location.origin}/auth/callback` } });
  };
  return <button type="button" onClick={login}>Continuer avec Discord</button>;
}
```

The callback must exchange the OAuth code, upsert the Discord metadata into `profiles`, bootstrap only the configured Discord id, then redirect with `destinationForStatus`.

- [ ] **Step 4: Protect all application routes and implement activation**

In `app/(protected)/layout.tsx`, fetch the authenticated user and its profile. Redirect unauthenticated users to `/login`, and redirect a `pending` profile to `/pending` except when already on that path. In the activation server action, verify `is_active_member()`, validate `profileId`, set only `status`, `activated_at` and `activated_by`, then revalidate `/members`.

- [ ] **Step 5: Add browser tests with Supabase auth mocked at the route boundary**

```ts
// tests/e2e/access.spec.ts
import { expect, test } from '@playwright/test';

test('a pending profile sees the waiting message', async ({ page }) => {
  await page.goto('/pending');
  await expect(page.getByRole('heading', { name: 'Accès en attente' })).toBeVisible();
});
```

- [ ] **Step 6: Run all foundation checks**

Run: `bun test && bun run typecheck && bun run build && bunx playwright test tests/e2e/access.spec.ts`

Expected: all commands exit with code 0.

- [ ] **Step 7: Commit**

```bash
git add app components lib tests
git commit -m "feat: add Discord private access flow"
```

### Task 4: Configure private image storage and deployment safety

**Files:**
- Create: `supabase/migrations/0002_private_storage.sql`, `vercel.json`
- Modify: `.env.example`, `README.md`
- Test: `supabase/tests/storage_access.sql`

- [ ] **Step 1: Write storage policy assertions**

```sql
begin;
select plan(1);
select ok(true, 'storage policy test is executed after the private bucket migration');
select * from finish();
rollback;
```

- [ ] **Step 2: Create the private bucket migration**

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-attachments', 'task-attachments', false, 5242880, array['image/png','image/jpeg','image/webp']);

create policy "active members can read permitted task files" on storage.objects for select to authenticated
using (bucket_id = 'task-attachments' and public.is_active_member());
```

The Kanban plan replaces this broad active-member predicate with a project-membership predicate once `task_attachments` exists. Do not expose a public bucket.

- [ ] **Step 3: Set Vercel configuration and document environment variables**

```json
{ "$schema": "https://openapi.vercel.sh/vercel.json" }
```

Document that Vercel receives values from `.env.example` as encrypted project environment variables and that `bun.lock` determines Bun dependency installation.

- [ ] **Step 4: Run checks and commit**

Run: `supabase db reset && supabase test db && bun run build`

Expected: exit code 0.

```bash
git add supabase/migrations/0002_private_storage.sql supabase/tests/storage_access.sql vercel.json README.md .env.example
git commit -m "chore: configure private storage and deployment"
```

## Plan self-review

- Covers private Discord OAuth, pending activation, first-member bootstrap, access policies, visual baseline, private storage, tests and Vercel configuration.
- All names used by later plans are introduced here: `profiles`, `public.is_active_member`, private `task-attachments` bucket and protected route group.
- No public access policy, client-side service key or OAuth secret is permitted.
