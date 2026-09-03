import { describe, expect, it } from "vitest";
import { filterCalendarItems, parseCalendarFilters, toCalendarItem } from "@/lib/calendar/query";
import { calendarEventSchema } from "@/lib/validations/calendar-event";

describe("calendar normalization", () => {
  it("validates event bounds, title and type", () => {
    const base = { projectId: "11111111-1111-4111-8111-111111111111", title: "Réunion", eventType: "meeting", startsAt: "2026-09-10T11:00:00Z", endsAt: "2026-09-10T10:00:00Z" };
    expect(calendarEventSchema.safeParse(base).success).toBe(false);
    expect(calendarEventSchema.safeParse({ ...base, endsAt: "2026-09-10T11:00:00Z", eventType: "wat" }).success).toBe(false);
    expect(calendarEventSchema.safeParse({ ...base, endsAt: "2026-09-10T11:00:00Z", description: "" }).success).toBe(true);
  });
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
      memberIds: [],
    });
  });

  it("normalizes an event and preserves its end", () => {
    expect(toCalendarItem({ id: "event-1", title: "Réunion", starts_at: "2026-09-10T10:00:00Z", ends_at: "2026-09-10T11:00:00Z", project_id: "project-1", event_type: "meeting" }, "event")).toMatchObject({
      id: "event:event-1", start: "2026-09-10T10:00:00Z", end: "2026-09-10T11:00:00Z", kind: "event", editable: true,
    });
  });

  it("maps the database development enum to public dev", () => {
    expect(toCalendarItem({ id: "event-2", title: "Dev", starts_at: "2026-09-10T10:00:00Z", ends_at: "2026-09-10T11:00:00Z", project_id: "project-1", event_type: "development" }, "event")?.eventType).toBe("dev");
    expect(toCalendarItem({ id: "event-3", title: "Bad", starts_at: "2026-09-10T10:00:00Z", ends_at: "2026-09-10T11:00:00Z", project_id: "project-1", event_type: "wat" }, "event")).toBeNull();
  });

  it("rejects malformed rows instead of manufacturing undefined values", () => {
    expect(toCalendarItem({ id: "x", title: "", project_id: "p" }, "task")).toBeNull();
  });

  it("ignores unsafe filter values and serializes only supported filters", () => {
    expect(parseCalendarFilters(new URLSearchParams("project=bad&member=also-bad&type=wat&q=%3Cscript%3E&hideDone=maybe"))).toEqual({});
    expect(parseCalendarFilters(new URLSearchParams("project=11111111-1111-4111-8111-111111111111&member=22222222-2222-4222-8222-222222222222&type=bugfix&q=API&hideDone=true"))).toEqual({ projectId: "11111111-1111-4111-8111-111111111111", memberId: "22222222-2222-4222-8222-222222222222", type: "bugfix", query: "API", hideDone: true });
  });

  it("filters by project, kind and completed state", () => {
    const items = [
      toCalendarItem({ id: "t1", title: "Done", due_at: "2026-09-10T09:00:00Z", project_id: "p1", completed: true, member_ids: ["m1"] }, "task"),
      toCalendarItem({ id: "t2", title: "Build API", due_at: "2026-09-11T09:00:00Z", project_id: "p2", completed: false, member_ids: ["m2"] }, "task"),
    ];
    expect(filterCalendarItems(items.filter((item): item is NonNullable<typeof item> => item !== null), { projectId: "p2", memberId: "m2", query: "api", hideDone: true }).map((item) => item.id)).toEqual(["task:t2"]);
  });
});
