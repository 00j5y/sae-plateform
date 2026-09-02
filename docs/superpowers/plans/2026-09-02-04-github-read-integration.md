# GitHub Read Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow each SAE to connect one GitHub repository and privately consult its branches, commits, pull requests and issues without writing anything to GitHub.

**Architecture:** A GitHub App installation token is created only on the server and restricted to the selected repository. Signed webhooks refresh a local read cache; the project UI always reads that cache and exposes its freshness, which provides graceful degradation when GitHub is unavailable.

**Tech Stack:** Next.js route handlers, TypeScript, Supabase PostgreSQL, Octokit, Zod, Vitest, Playwright.

---

## Target structure

```text
app/(protected)/projects/[projectId]/github/page.tsx
app/api/github/webhook/route.ts
components/github/github-overview.tsx
components/github/repository-connect-form.tsx
lib/github/app.ts
lib/github/signature.ts
lib/github/sync.ts
lib/github/types.ts
lib/validations/github.ts
supabase/migrations/0005_github_read_cache.sql
tests/unit/github-signature.test.ts
tests/unit/github-sync.test.ts
tests/e2e/github.spec.ts
```

### Task 1: Create the repository and cache schema

**Files:**
- Create: `supabase/migrations/0005_github_read_cache.sql`
- Test: `supabase/tests/github_access.sql`

- [ ] **Step 1: Write failing schema expectations**

```sql
begin;
select plan(1);
select ok(to_regclass('public.github_repositories') is not null, 'GitHub repository table exists after migration');
select * from finish();
rollback;
```

- [ ] **Step 2: Run before migration**

Run: `supabase test db`

Expected: failure because the table does not exist.

- [ ] **Step 3: Add one-repository-per-project storage and RLS**

```sql
create table public.github_repositories (
  project_id uuid primary key references public.projects(id) on delete cascade,
  installation_id bigint not null, owner text not null, name text not null,
  external_id bigint not null unique, connected_by uuid not null references public.profiles(id), connected_at timestamptz not null default now()
);
create table public.github_sync_state (
  project_id uuid primary key references public.projects(id) on delete cascade,
  status text not null check (status in ('fresh','syncing','error')), synced_at timestamptz,
  error_message text, updated_at timestamptz not null default now()
);
create table public.github_snapshots (
  project_id uuid primary key references public.projects(id) on delete cascade,
  branches jsonb not null default '[]', commits jsonb not null default '[]', pull_requests jsonb not null default '[]', issues jsonb not null default '[]', updated_at timestamptz not null default now()
);
alter table public.github_repositories enable row level security; alter table public.github_sync_state enable row level security; alter table public.github_snapshots enable row level security;
create policy "members read repository settings" on public.github_repositories for select to authenticated using (public.is_project_member(project_id));
create policy "members read sync state" on public.github_sync_state for select to authenticated using (public.is_project_member(project_id));
create policy "members read GitHub snapshots" on public.github_snapshots for select to authenticated using (public.is_project_member(project_id));
```

- [ ] **Step 4: Reset database and commit**

Run: `supabase db reset && supabase test db`

Expected: exit code 0.

```bash
git add supabase/migrations/0005_github_read_cache.sql supabase/tests/github_access.sql
git commit -m "feat: add GitHub read cache schema"
```

### Task 2: Implement verified webhook ingestion and read-only synchronization

**Files:**
- Create: `lib/github/signature.ts`, `lib/github/app.ts`, `lib/github/sync.ts`, `lib/github/types.ts`, `app/api/github/webhook/route.ts`
- Test: `tests/unit/github-signature.test.ts`, `tests/unit/github-sync.test.ts`

- [ ] **Step 1: Write failing signature and mapping tests**

```ts
import { expect, it } from 'vitest';
import { verifyGitHubSignature } from '@/lib/github/signature';

it('rejects an invalid GitHub webhook signature', () => {
  expect(verifyGitHubSignature('secret', '{"x":1}', 'sha256=wrong')).toBe(false);
});
```

```ts
import { expect, it } from 'vitest';
import { toCommitSnapshot } from '@/lib/github/sync';
it('keeps only data needed by the UI', () => expect(toCommitSnapshot({ sha: 'abc', commit: { message: 'feat: login' }, html_url: 'https://github.com/x/y/commit/abc' })).toEqual({ sha: 'abc', message: 'feat: login', url: 'https://github.com/x/y/commit/abc' }));
```

- [ ] **Step 2: Verify unit tests fail**

Run: `bun test tests/unit/github-signature.test.ts tests/unit/github-sync.test.ts`

Expected: missing modules.

- [ ] **Step 3: Implement HMAC validation and server-only Octokit client**

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';
export function verifyGitHubSignature(secret: string, payload: string, header: string | null): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(header));
}
```

The webhook route must read the raw body once, reject an invalid signature with `401`, select the matching repository by GitHub `repository.id`, and call a service-role server function to refresh the four JSON snapshots. It must never perform issue, pull-request, branch or commit writes to GitHub.

- [ ] **Step 4: Test the route and commit**

Run: `bun test tests/unit/github-signature.test.ts tests/unit/github-sync.test.ts && bun run typecheck`

Expected: exit code 0.

```bash
git add app/api/github lib/github tests/unit/github-*.test.ts
git commit -m "feat: sync signed GitHub read data"
```

### Task 3: Build repository connection and project GitHub view

**Files:**
- Create: `app/(protected)/projects/[projectId]/github/page.tsx`, `components/github/github-overview.tsx`, `components/github/repository-connect-form.tsx`, `lib/validations/github.ts`
- Test: `tests/e2e/github.spec.ts`

- [ ] **Step 1: Write the failing user journey**

```ts
import { expect, test } from '@playwright/test';
test('a project member reads cached pull requests', async ({ page }) => {
  await page.goto('/projects/seed-project/github');
  await expect(page.getByRole('heading', { name: 'GitHub' })).toBeVisible();
  await expect(page.getByText('feat: connexion Discord')).toBeVisible();
});
```

- [ ] **Step 2: Verify it fails before the page exists**

Run: `bunx playwright test tests/e2e/github.spec.ts`

Expected: page or expected content missing.

- [ ] **Step 3: Implement the view and degradation state**

Render four labelled, keyboard-navigable sections: Branches, Commits, Pull requests and Issues. Every external URL opens with `target="_blank" rel="noreferrer"`. Display the last `synced_at`; if state is `error`, keep snapshots visible, show a concise warning and expose a member-only `Relancer la synchronisation` button that invokes the read-only sync service.

```tsx
<a href={pullRequest.url} target="_blank" rel="noreferrer">{pullRequest.title}</a>
```

- [ ] **Step 4: Run final integration checks**

Run: `bun test && bun run typecheck && bun run build && bunx playwright test tests/e2e/github.spec.ts`

Expected: all commands exit code 0.

- [ ] **Step 5: Commit**

```bash
git add app components lib tests/e2e/github.spec.ts
git commit -m "feat: display project GitHub activity"
```

## Plan self-review

- Covers one repository per SAE, GitHub App access, signed webhook verification, branches, commits, PR, issues, a cached fallback state and manual read-only refresh.
- Explicitly excludes all GitHub write operations and never exposes the app private key to a browser.
