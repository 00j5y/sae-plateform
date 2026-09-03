import "server-only";

import { getE2eKanbanData, isE2eFixtureMode } from "@/lib/kanban/e2e-fixture";
import { getKanbanData } from "@/lib/kanban/data";
import { toCalendarItem } from "@/lib/calendar/query";
import type { CalendarItem } from "@/lib/calendar/types";
import { createClient } from "@/lib/supabase/server";

export type CalendarData = {
  items: CalendarItem[];
  projects: Awaited<ReturnType<typeof getKanbanData>>["projects"];
  members: Awaited<ReturnType<typeof getKanbanData>>["members"];
  columns: Awaited<ReturnType<typeof getKanbanData>>["columns"];
  tasks: Awaited<ReturnType<typeof getKanbanData>>["tasks"];
};

function eventFixture(): CalendarItem[] {
  return [
    { id: "event:11111111-1111-4111-8111-111111111111", title: "Phase de développement", projectId: "3b189510-dc96-4ea7-8521-b48003063b90", kind: "event", editable: true, color: "#6D4AFF", completed: false, memberIds: ["00000000-0000-4000-8000-000000000001"], eventType: "dev", start: "2026-09-08T09:00:00.000Z", end: "2026-09-08T11:00:00.000Z" },
    { id: "event:22222222-2222-4222-8222-222222222222", title: "Rendu SAE Java", projectId: "f06ca2c0-0c2a-4d1a-b441-2fac7ff847ab", kind: "event", editable: true, color: "#E06C00", completed: false, memberIds: ["00000000-0000-4000-8000-000000000001"], eventType: "deadline", start: "2026-09-15T12:00:00.000Z", end: "2026-09-15T12:30:00.000Z" }
  ];
}

function taskItems(tasks: Awaited<ReturnType<typeof getKanbanData>>["tasks"]): CalendarItem[] {
  return tasks.filter((task) => Boolean(task.dueAt)).map((task) => ({
    id: `task:${task.id}`, title: task.title, start: task.dueAt!, projectId: task.projectId,
    kind: "task", editable: false, color: task.color, completed: false,
    memberIds: task.assignees.map((member) => member.id)
  }));
}

export async function getCalendarData(): Promise<CalendarData> {
  if (isE2eFixtureMode()) {
    const data = getE2eKanbanData();
    return { ...data, items: eventFixture() };
  }

  const kanban = await getKanbanData();
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("calendar_events")
    .select("id,title,project_id,event_type,starts_at,ends_at,description,created_by")
    .order("starts_at", { ascending: true });
  if (error) throw new Error("Impossible de charger le calendrier pour le moment.");
  const eventItems = (events ?? []).map((event) => toCalendarItem({ ...event, member_ids: [event.created_by] }, "event"))
    .filter((event): event is CalendarItem => event !== null);
  return { ...kanban, items: [...eventItems, ...taskItems(kanban.tasks)] };
}
