import Link from "next/link";

import { CalendarView } from "@/components/calendar/calendar-view";
import { calendarFiltersToSearchParams } from "@/lib/calendar/query";
import type { CalendarData } from "@/lib/calendar/data";
import type { CalendarFilters } from "@/lib/calendar/types";

type Props = CalendarData & { filters: CalendarFilters };

export function DashboardOverview({ items, projects, members, tasks, columns, filters }: Props) {
  const upcoming = tasks.filter((task) => task.dueAt).sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()).slice(0, 5);
  const calendarQuery = calendarFiltersToSearchParams(filters).toString();
  return <main className="dashboard-page"><div className="page-heading"><div><p className="eyebrow">Tableau de bord</p><h1>SAE Platform</h1><p>Le point d’avancement de vos SAE.</p></div></div>
    <section className="dashboard-card dashboard-calendar" aria-labelledby="dashboard-calendar-title"><div className="section-heading"><div><h2 id="dashboard-calendar-title">Calendrier global</h2><p>Les éléments correspondent aux filtres de l’URL.</p></div><Link className="secondary-button" href={`/calendar${calendarQuery ? `?${calendarQuery}` : ""}`}>Voir le calendrier</Link></div><CalendarView compact filters={filters} items={items} members={members} projects={projects} /></section>
    <section className="dashboard-card" aria-labelledby="deadlines-title"><h2 id="deadlines-title">Tâches proches de l’échéance</h2>{upcoming.length ? <ul className="deadline-list">{upcoming.map((task) => <li key={task.id}><strong>{task.title}</strong><span>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(task.dueAt!))}</span></li>)}</ul> : <p className="muted">Aucune tâche à échéance à venir.</p>}</section>
    <section className="dashboard-card" aria-labelledby="pull-requests-title"><h2 id="pull-requests-title">Pull requests ouvertes</h2><p className="muted">Indisponible : aucun résumé GitHub n’est configuré pour le moment.</p></section>
    <section className="dashboard-card" aria-labelledby="kanban-totals-title"><h2 id="kanban-totals-title">Totaux Kanban</h2><ul className="kanban-totals">{columns.map((column) => <li key={column.id}><span>{column.name}</span><strong>{tasks.filter((task) => task.columnId === column.id).length}</strong></li>)}</ul></section>
  </main>;
}
