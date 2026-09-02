# Projects, Kanban and Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let equal project members create SAE projects and manage a shared, filterable Kanban with assignees, comments and private image evidence.

**Architecture:** This plan extends the active-member foundation with project membership RLS, a single common column set and tasks scoped to one project. Route handlers and server actions mutate data only after the same database membership checks; client components use optimistic visual feedback for drag and drop.

**Tech Stack:** Next.js, React, TypeScript, Supabase PostgreSQL/Realtime/Storage, dnd-kit, Zod, Vitest, Testing Library, Playwright, Motion.

---

## Target structure

```text
app/(protected)/projects/page.tsx
app/(protected)/projects/[projectId]/page.tsx
app/(protected)/kanban/page.tsx
components/projects/project-form.tsx
components/kanban/kanban-board.tsx
components/kanban/task-card.tsx
components/kanban/task-dialog.tsx
components/kanban/kanban-filters.tsx
components/tasks/comment-thread.tsx
components/tasks/attachment-uploader.tsx
lib/projects/actions.ts
lib/tasks/actions.ts
lib/tasks/reorder.ts
lib/validations/project.ts
lib/validations/task.ts
supabase/migrations/0003_projects_kanban.sql
tests/unit/reorder.test.ts
tests/unit/task-validation.test.ts
tests/e2e/kanban.spec.ts
```

### Task 1: Add project and Kanban schema with equal-member policies

**Files:**
- Create: `supabase/migrations/0003_projects_kanban.sql`
- Test: `supabase/tests/project_kanban_access.sql`

- [ ] **Step 1: Write the failing database assertions**

```sql
begin;
select plan(2);
select ok(to_regclass('public.projects') is not null, 'projects table exists after migration');
select ok(to_regclass('public.tasks') is not null, 'tasks table exists after migration');
select * from finish();
rollback;
```

- [ ] **Step 2: Run the test before the migration**

Run: `supabase test db`

Expected: failure because the project and task tables do not exist.

- [ ] **Step 3: Create tables, common columns and RLS helpers**

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '', color text not null default '#6D4AFF',
  starts_on date, ends_on date, created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), primary key (project_id, profile_id)
);
create table public.kanban_columns (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  position numeric not null unique check (position >= 0)
);
insert into public.kanban_columns (name, position) values
  ('Backlog', 1000), ('À faire', 2000), ('En cours', 3000), ('À tester', 4000), ('Terminé', 5000);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  column_id uuid not null references public.kanban_columns(id), title text not null check (char_length(title) between 1 and 160),
  description text not null default '', color text not null default '#6D4AFF', due_at timestamptz,
  position numeric not null, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.task_assignees (task_id uuid references public.tasks(id) on delete cascade, profile_id uuid references public.profiles(id) on delete cascade, primary key (task_id, profile_id));
create table public.task_comments (id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade, author_id uuid not null references public.profiles(id), body text not null check (char_length(body) between 1 and 5000), created_at timestamptz not null default now());
create table public.task_attachments (id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade, path text not null unique, filename text not null, mime_type text not null, size_bytes integer not null check (size_bytes > 0), uploaded_by uuid not null references public.profiles(id), created_at timestamptz not null default now());
create or replace function public.is_project_member(target_project uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.project_members where project_id = target_project and profile_id = auth.uid()) $$;
alter table public.projects enable row level security; alter table public.project_members enable row level security; alter table public.kanban_columns enable row level security; alter table public.tasks enable row level security; alter table public.task_assignees enable row level security; alter table public.task_comments enable row level security; alter table public.task_attachments enable row level security;
create policy "members manage visible projects" on public.projects for all to authenticated using (public.is_project_member(id)) with check (public.is_active_member());
create policy "active creates projects" on public.projects for insert to authenticated with check (public.is_active_member() and created_by = auth.uid());
create policy "members manage memberships" on public.project_members for all to authenticated using (public.is_project_member(project_id)) with check (public.is_project_member(project_id) or exists(select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid()));
create policy "active members read columns" on public.kanban_columns for select to authenticated using (public.is_active_member());
create policy "active members manage columns" on public.kanban_columns for all to authenticated using (public.is_active_member()) with check (public.is_active_member());
create policy "members manage tasks" on public.tasks for all to authenticated using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy "members manage assignees" on public.task_assignees for all to authenticated using (exists(select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id))) with check (exists(select 1 from public.tasks t join public.project_members pm on pm.project_id = t.project_id where t.id = task_id and pm.profile_id = profile_id));
create policy "members manage comments" on public.task_comments for all to authenticated using (exists(select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id))) with check (author_id = auth.uid());
create policy "members manage attachments" on public.task_attachments for all to authenticated using (exists(select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id))) with check (uploaded_by = auth.uid());
```

- [ ] **Step 4: Add storage policies tied to task ownership**

```sql
drop policy "active members can read permitted task files" on storage.objects;
create policy "project members read task attachments" on storage.objects for select to authenticated using (
  bucket_id = 'task-attachments' and exists (select 1 from public.task_attachments a join public.tasks t on t.id = a.task_id where a.path = name and public.is_project_member(t.project_id))
);
```

- [ ] **Step 5: Reset the local database and run database tests**

Run: `supabase db reset && supabase test db`

Expected: all project, task and private-storage policies are installed.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0003_projects_kanban.sql supabase/tests/project_kanban_access.sql
git commit -m "feat: add projects and Kanban schema"
```

### Task 2: Implement project creation, membership and task validation

**Files:**
- Create: `lib/validations/project.ts`, `lib/validations/task.ts`, `lib/projects/actions.ts`, `lib/tasks/actions.ts`
- Create: `components/projects/project-form.tsx`
- Test: `tests/unit/task-validation.test.ts`, `tests/unit/reorder.test.ts`

- [ ] **Step 1: Write the failing task tests**

```ts
import { expect, it } from 'vitest';
import { taskSchema } from '@/lib/validations/task';
import { nextPosition } from '@/lib/tasks/reorder';

it('requires a project and title', () => expect(taskSchema.safeParse({ title: '' }).success).toBe(false));
it('places a card midway between neighbours', () => expect(nextPosition(1000, 2000)).toBe(1500));
```

- [ ] **Step 2: Verify the tests fail**

Run: `bun test tests/unit/task-validation.test.ts tests/unit/reorder.test.ts`

Expected: missing module errors.

- [ ] **Step 3: Add validation and deterministic ordering**

```ts
import { z } from 'zod';
export const taskSchema = z.object({ projectId: z.string().uuid(), columnId: z.string().uuid(), title: z.string().trim().min(1).max(160), description: z.string().max(10000).default(''), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), dueAt: z.string().datetime().nullable(), assigneeIds: z.array(z.string().uuid()).default([]) });
```

```ts
export const nextPosition = (before: number | null, after: number | null) => before === null ? (after ?? 1000) - 1000 : after === null ? before + 1000 : (before + after) / 2;
```

Server actions must insert the creator in `project_members` in the same database transaction, and only select assignees who belong to the task project.

- [ ] **Step 4: Run unit tests and typecheck**

Run: `bun test tests/unit/task-validation.test.ts tests/unit/reorder.test.ts && bun run typecheck`

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add lib/validations lib/projects/actions.ts lib/tasks/actions.ts tests/unit
git commit -m "feat: validate projects and tasks"
```

### Task 3: Build the responsive common Kanban and task collaboration UI

**Files:**
- Create: `app/(protected)/kanban/page.tsx`, `app/(protected)/projects/page.tsx`, `app/(protected)/projects/[projectId]/page.tsx`
- Create: `components/kanban/kanban-board.tsx`, `components/kanban/task-card.tsx`, `components/kanban/task-dialog.tsx`, `components/kanban/kanban-filters.tsx`, `components/tasks/comment-thread.tsx`, `components/tasks/attachment-uploader.tsx`
- Test: `tests/e2e/kanban.spec.ts`

- [ ] **Step 1: Write the failing browser scenario**

```ts
import { expect, test } from '@playwright/test';
test('an active member creates and moves a task', async ({ page }) => {
  await page.goto('/kanban');
  await page.getByRole('button', { name: 'Nouvelle tâche' }).click();
  await page.getByLabel('Titre').fill('Écrire les tests');
  await page.getByRole('button', { name: 'Créer la tâche' }).click();
  await expect(page.getByText('Écrire les tests')).toBeVisible();
});
```

- [ ] **Step 2: Verify it fails before the page exists**

Run: `bunx playwright test tests/e2e/kanban.spec.ts`

Expected: failure because `/kanban` has no task UI.

- [ ] **Step 3: Implement accessible board behaviour**

Use `@dnd-kit/core` and `@dnd-kit/sortable`. Pointer drag must track the grabbed card directly, retain keyboard alternatives, and call the reorder server action with `taskId`, target `columnId`, `beforeTaskId` and `afterTaskId`. Use a critically damped Motion spring for the drop settle, with no decorative bounce. On mobile, render the selected column as a horizontal carousel and open task details in a dialog.

```tsx
<button type="button" aria-label="Nouvelle tâche">Nouvelle tâche</button>
<label>Titre<input name="title" required maxLength={160} /></label>
```

- [ ] **Step 4: Implement comments and uploads**

The uploader must reject any file except PNG, JPEG or WebP above 5 MiB before upload, store it at `${projectId}/${taskId}/${crypto.randomUUID()}`, then create `task_attachments`. Render image access through a short-lived signed URL generated server-side only after checking project membership.

- [ ] **Step 5: Run feature checks**

Run: `bun test && bun run typecheck && bunx playwright test tests/e2e/kanban.spec.ts`

Expected: all pass, including keyboard navigation and card creation.

- [ ] **Step 6: Commit**

```bash
git add app components lib tests/e2e/kanban.spec.ts
git commit -m "feat: add common Kanban collaboration"
```

## Plan self-review

- Implements private project access, equal project members, common columns, task details, multi-assignment, comments, private evidence images, filters and responsive direct manipulation.
- Calendar-specific task deadline rendering is intentionally supplied by Plan 03, while this plan owns the task data.
