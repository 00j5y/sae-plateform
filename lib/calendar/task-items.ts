import type { CalendarItem } from "@/lib/calendar/types";
import type { KanbanColumn, KanbanTask } from "@/lib/kanban/types";

export type CalendarTaskSource = Pick<KanbanTask, "id" | "title" | "dueAt" | "projectId" | "color" | "columnId" | "assignees">;
export type CalendarColumnSource = Pick<KanbanColumn, "id" | "name">;

function isFinishedColumn(column: CalendarColumnSource | undefined) {
  return column?.name.trim().toLocaleLowerCase("fr-FR") === "terminé";
}

export function toCalendarTaskItems(tasks: CalendarTaskSource[], columns: CalendarColumnSource[]): CalendarItem[] {
  const columnsById = new Map(columns.map((column) => [column.id, column]));
  return tasks.filter((task) => Boolean(task.dueAt)).map((task) => ({
    id: `task:${task.id}`, title: task.title, start: task.dueAt!, projectId: task.projectId,
    kind: "task", editable: false, color: task.color, completed: isFinishedColumn(columnsById.get(task.columnId)),
    memberIds: task.assignees.map((member) => member.id)
  }));
}
