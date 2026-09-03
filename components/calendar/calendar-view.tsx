"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useMemo, useState } from "react";

import { CalendarFilters } from "@/components/calendar/calendar-filters";
import { EventDialog } from "@/components/calendar/event-dialog";
import type { DialogSourceRect } from "@/lib/calendar/dialog-anchor";
import { filterCalendarItems } from "@/lib/calendar/query";
import type { CalendarFilters as FilterValues, CalendarItem } from "@/lib/calendar/types";
import type { KanbanMember, Project } from "@/lib/kanban/types";

type Props = { items: CalendarItem[]; projects: Project[]; members: KanbanMember[]; filters: FilterValues; compact?: boolean };

export function CalendarView({ items, projects, members, filters, compact = false }: Props) {
  const [selected, setSelected] = useState<CalendarItem>();
  const [sourceRect, setSourceRect] = useState<DialogSourceRect>();
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const events = useMemo(() => filterCalendarItems(items, filters).map((item) => ({ id: item.id, title: item.title, start: item.start, end: item.end, color: item.color, editable: item.editable, extendedProps: { item } })), [filters, items]);
  return <section aria-label={compact ? "Aperçu du calendrier" : "Calendrier global"} className={`calendar-shell${compact ? " calendar-compact" : ""}`}>
    {!compact ? <div className="calendar-toolbar"><CalendarFilters members={members} projects={projects} value={filters} /><button className="primary-button" onClick={() => setCreating(true)} type="button">Nouvel événement</button></div> : null}
    <p aria-live="polite" className="form-status">{message}</p>
    <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, listPlugin]} initialView={compact ? "listWeek" : "dayGridMonth"} headerToolbar={compact ? { left: "title", center: "", right: "" } : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,listWeek" }} buttonText={{ today: "Aujourd’hui", month: "Mois", week: "Semaine", list: "Liste" }} eventClick={(info) => { const item = info.event.extendedProps.item as CalendarItem; if (item.editable) { const rect = info.el.getBoundingClientRect(); info.el.focus(); setSourceRect({ top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height }); setSelected(item); } }} events={events} firstDay={1} height="auto" locale="fr" noEventsText="Aucun élément pour ces filtres." eventClassNames={(arg) => arg.event.extendedProps.item.editable ? "calendar-event-editable" : "calendar-task-readonly"} />
    {creating || selected ? <EventDialog event={selected} onAnnounce={setMessage} onClose={() => { setCreating(false); setSelected(undefined); setSourceRect(undefined); }} projects={projects} sourceRect={selected ? sourceRect : undefined} /> : null}
  </section>;
}
