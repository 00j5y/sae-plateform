import type { CalendarFilters, CalendarItem, CalendarEventType } from "@/lib/calendar/types";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const types = new Set<CalendarEventType>(["dev", "testing", "bugfix", "meeting", "deadline"]);

export function toCalendarItem(row: Record<string, unknown>, kind: "event" | "task"): CalendarItem {
  const id = String(row.id);
  const item: CalendarItem = {
    id: `${kind}:${id}`, title: String(row.title), projectId: String(row.project_id), kind,
    start: String(kind === "task" ? row.due_at : row.starts_at), editable: kind === "event",
  };
  if (kind === "event") { item.end = String(row.ends_at); item.eventType = row.event_type as CalendarEventType; }
  if (row.color) item.color = String(row.color);
  if (typeof row.completed === "boolean") item.completed = row.completed;
  return item;
}

export function parseCalendarFilters(params: URLSearchParams): CalendarFilters {
  const filters: CalendarFilters = {};
  const project = params.get("project"); if (project && uuid.test(project)) filters.projectId = project;
  const member = params.get("member"); if (member && uuid.test(member)) filters.memberId = member;
  const type = params.get("type"); if (type && types.has(type as CalendarEventType)) filters.type = type as CalendarEventType;
  const query = params.get("q")?.trim(); if (query && query.length <= 160 && !/[<>]/.test(query)) filters.query = query;
  const hideDone = params.get("hideDone"); if (hideDone === "true" || hideDone === "false") filters.hideDone = hideDone === "true";
  return filters;
}

export function calendarFiltersToSearchParams(filters: CalendarFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.projectId && uuid.test(filters.projectId)) p.set("project", filters.projectId);
  if (filters.memberId && uuid.test(filters.memberId)) p.set("member", filters.memberId);
  if (filters.type && types.has(filters.type)) p.set("type", filters.type);
  if (filters.query?.trim()) p.set("q", filters.query.trim().slice(0, 160));
  if (filters.hideDone !== undefined) p.set("hideDone", String(filters.hideDone));
  return p;
}

export function filterCalendarItems(items: CalendarItem[], filters: CalendarFilters): CalendarItem[] {
  const q = filters.query?.toLocaleLowerCase();
  return items.filter((item) => (!filters.projectId || item.projectId === filters.projectId)
    && (!filters.type || item.eventType === filters.type)
    && (!filters.hideDone || !item.completed)
    && (!q || item.title.toLocaleLowerCase().includes(q)));
}
