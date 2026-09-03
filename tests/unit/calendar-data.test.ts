import { describe, expect, it } from "vitest";

import { toCalendarTaskItems } from "@/lib/calendar/task-items";
import { filterCalendarItems } from "@/lib/calendar/query";

describe("calendar task completion", () => {
  it("marks tasks in the Terminé Kanban column completed so hideDone excludes them", () => {
    const items = toCalendarTaskItems([
      { id: "done", title: "Publier", dueAt: "2026-09-10T09:00:00.000Z", projectId: "project", color: "#00AA55", columnId: "finished", assignees: [] },
      { id: "open", title: "Tester", dueAt: "2026-09-11T09:00:00.000Z", projectId: "project", color: "#6D4AFF", columnId: "doing", assignees: [] }
    ], [
      { id: "doing", name: "En cours" }, { id: "finished", name: "Terminé" }
    ]);

    expect(items.find((item) => item.id === "task:done")?.completed).toBe(true);
    expect(filterCalendarItems(items, { hideDone: true }).map((item) => item.id)).toEqual(["task:open"]);
  });
});
