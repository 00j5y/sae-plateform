# Calendar and Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide the chosen overview-first home page and a global calendar that combines all SAE periods, events and task deadlines with precise filters.

**Architecture:** Manual project events are stored in `calendar_events`; task deadlines are normalized into read-only calendar items at query time rather than duplicated. URL search parameters are the single source of truth for global filters, so dashboard, calendar and project views remain shareable and consistent.

**Tech Stack:** Next.js, React, TypeScript, Supabase PostgreSQL, date-fns, FullCalendar, Zod, Vitest, Playwright, Motion.

---

## Target structure

```text
app/(protected)/page.tsx
app/(protected)/calendar/page.tsx
components/dashboard/overview.tsx
components/calendar/calendar-view.tsx
components/calendar/calendar-filters.tsx
components/calendar/event-dialog.tsx
lib/calendar/query.ts
lib/calendar/types.ts
lib/calendar/actions.ts
lib/validations/calendar-event.ts
supabase/migrations/0004_calendar.sql
tests/unit/calendar-query.test.ts
tests/e2e/calendar.spec.ts
```

### Task 1: Add calendar event schema and project-member RLS

**Files:**
- Create: `supabase/migrations/0004_calendar.sql`
- Test: `supabase/tests/calendar_access.sql`

- [ ] **Step 1: Write the failing schema test**

```sql
begin;
select plan(1);
select ok(to_regclass('public.calendar_events') is not null, 'calendar events table exists after migration');
select * from finish();
rollback;
```

- [ ] **Step 2: Run the test before migration**

Run: `supabase test db`

Expected: failure because the table does not exist.

- [ ] **Step 3: Add event storage and policies**

```sql
create type public.calendar_event_type as enum ('development', 'testing', 'bugfix', 'meeting', 'deadline');
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160), event_type public.calendar_event_type not null,
  starts_at timestamptz not null, ends_at timestamptz not null, description text not null default '',
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);
alter table public.calendar_events enable row level security;
create policy "project members manage events" on public.calendar_events for all to authenticated
using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
```

- [ ] **Step 4: Reset the database and commit**

Run: `supabase db reset && supabase test db`

Expected: migration and tests succeed.

```bash
git add supabase/migrations/0004_calendar.sql supabase/tests/calendar_access.sql
git commit -m "feat: add project calendar events"
```

### Task 2: Normalize calendar items and validate filters

**Files:**
- Create: `lib/calendar/types.ts`, `lib/calendar/query.ts`, `lib/validations/calendar-event.ts`, `lib/calendar/actions.ts`
- Test: `tests/unit/calendar-query.test.ts`

- [ ] **Step 1: Write failing date and task-deadline tests**

```ts
import { expect, it } from 'vitest';
import { toCalendarItem } from '@/lib/calendar/query';

it('turns a task deadline into a read-only calendar item', () => {
  expect(toCalendarItem({ id: 't1', title: 'Tester', dueAt: '2026-09-10T10:00:00.000Z' })).toMatchObject({ id: 'task:t1', editable: false });
});
```

- [ ] **Step 2: Verify it fails**

Run: `bun test tests/unit/calendar-query.test.ts`

Expected: missing-module error.

- [ ] **Step 3: Implement shared types and query functions**

```ts
export type CalendarItem = { id: string; title: string; start: string; end?: string; projectId: string; kind: 'event' | 'task'; editable: boolean; color: string };
export const toCalendarItem = (task: { id: string; title: string; dueAt: string; projectId?: string; color?: string }): CalendarItem => ({ id: `task:${task.id}`, title: task.title, start: task.dueAt, projectId: task.projectId ?? '', kind: 'task', editable: false, color: task.color ?? '#6D4AFF' });
```

Create `calendarEventSchema` requiring project UUID, title, event type, ISO start, ISO end and a non-inverted range. Parse `project`, `member`, `type`, `q` and `hideDone` from URL parameters; invalid values are ignored, never interpolated into SQL.

- [ ] **Step 4: Run tests and commit**

Run: `bun test tests/unit/calendar-query.test.ts && bun run typecheck`

Expected: exit code 0.

```bash
git add lib/calendar lib/validations/calendar-event.ts tests/unit/calendar-query.test.ts
git commit -m "feat: normalize calendar data and filters"
```

### Task 3: Build calendar and overview-first dashboard

**Files:**
- Create: `app/(protected)/page.tsx`, `app/(protected)/calendar/page.tsx`
- Create: `components/dashboard/overview.tsx`, `components/calendar/calendar-view.tsx`, `components/calendar/calendar-filters.tsx`, `components/calendar/event-dialog.tsx`
- Test: `tests/e2e/calendar.spec.ts`

- [ ] **Step 1: Write the failing end-to-end calendar scenario**

```ts
import { expect, test } from '@playwright/test';
test('filters the global calendar to one SAE', async ({ page }) => {
  await page.goto('/calendar');
  await page.getByLabel('SAE').selectOption({ label: 'SAE Plateforme' });
  await expect(page.getByText('Phase de développement')).toBeVisible();
  await expect(page.getByText('Rendu SAE Java')).not.toBeVisible();
});
```

- [ ] **Step 2: Verify it fails before the calendar UI exists**

Run: `bunx playwright test tests/e2e/calendar.spec.ts`

Expected: missing form controls or page content.

- [ ] **Step 3: Implement the views and Apple-style feedback**

Render month, week and list modes with FullCalendar. Filter changes update `URLSearchParams` and preserve every other filter. The overview page must show, in order: global filtered calendar preview, tasks close to deadline, open pull-request summary supplied by Plan 04, then Kanban totals. Use opaque content cards above a restrained translucent navigation layer; opening an event uses a source-anchored dialog and `prefers-reduced-motion` switches it to a short opacity fade.

```tsx
<select aria-label="SAE" defaultValue={selectedProject ?? ''} onChange={(event) => setProject(event.target.value)}>
  <option value="">Toutes les SAE</option>
  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
</select>
```

- [ ] **Step 4: Run checks and commit**

Run: `bun test && bun run typecheck && bunx playwright test tests/e2e/calendar.spec.ts`

Expected: all pass.

```bash
git add app components lib tests/e2e/calendar.spec.ts
git commit -m "feat: add global calendar and dashboard"
```

## Plan self-review

- Covers global and project-scoped calendar views, all required event types, deadlines derived from tasks, filter persistence and the overview-first dashboard chosen in design.
- Does not duplicate task deadline records, so edits to a task remain the sole source of truth.
