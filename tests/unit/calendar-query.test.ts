import { describe, expect, it } from "vitest";
import { filterCalendarItems, parseCalendarFilters, toCalendarItem } from "@/lib/calendar/query";

describe("calendar normalization", () => {
  it("turns a task deadline into a non-editable calendar item", () => {
    expect(toCalendarItem({
      id: "task-1",
      title: "Livrer la feature",
      due_at: "2026-09-10T09:00:00.000Z",
      project_id: "project-1",
      color: "#6D4AFF",
      completed: false,
    }, "task")).toEqual({
      id: "task:task-1",
      title: "Livrer la feature",
      start: "2026-09-10T09:00:00.000Z",
      projectId: "project-1",
      kind: "task",
      editable: false,
      color: "#6D4AFF",
      completed: false,
    });
  });

  it("normalizes an event and preserves its end", () => {
    expect(toCalendarItem({ id: "event-1", title: "Réunion", starts_at: "2026-09-10T10:00:00Z", ends_at: "2026-09-10T11:00:00Z", project_id: "project-1", event_type: "meeting" }, "event")).toMatchObject({
      id: "event:event-1", start: "2026-09-10T10:00:00Z", end: "2026-09-10T11:00:00Z", kind: "event", editable: true,
    });
  });

  it("ignores unsafe filter values and serializes only supported filters", () => {
    expect(parseCalendarFilters(new URLSearchParams("project=bad&member=also-bad&type=wat&q=%3Cscript%3E&hideDone=maybe"))).toEqual({});
    expect(parseCalendarFilters(new URLSearchParams("project=11111111-1111-4111-8111-111111111111&member=22222222-2222-4222-8222-222222222222&type=bugfix&q=API&hideDone=true"))).toEqual({ projectId: "11111111-1111-4111-8111-111111111111", memberId: "22222222-2222-4222-8222-222222222222", type: "bugfix", query: "API", hideDone: true });
  });

  it("filters by project, kind and completed state", () => {
    const items = [
      toCalendarItem({ id: "t1", title: "Done", due_at: "2026-09-10T09:00:00Z", project_id: "p1", completed: true }, "task"),
      toCalendarItem({ id: "t2", title: "Build API", due_at: "2026-09-11T09:00:00Z", project_id: "p2", completed: false }, "task"),
    ];
    expect(filterCalendarItems(items, { projectId: "p2", query: "api", hideDone: true }).map((item) => item.id)).toEqual(["task:t2"]);
  });
});
