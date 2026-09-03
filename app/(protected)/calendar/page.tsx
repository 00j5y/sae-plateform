import { redirect } from "next/navigation";

import { CalendarView } from "@/components/calendar/calendar-view";
import { getCurrentMemberAccess } from "@/lib/auth/access";
import { getCalendarData } from "@/lib/calendar/data";
import { parseCalendarFilters } from "@/lib/calendar/query";

function toSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) if (typeof value === "string") params.set(key, value);
  return params;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const access = await getCurrentMemberAccess();
  if (!access) redirect("/login");
  if (access.status !== "active") redirect("/pending");
  const filters = parseCalendarFilters(toSearchParams(await searchParams));
  const data = await getCalendarData();
  return <main className="calendar-page"><div className="page-heading"><div><p className="eyebrow">Organisation</p><h1>Calendrier</h1><p>Visualisez les événements et échéances de toutes vos SAE.</p></div></div><CalendarView {...data} filters={filters} /></main>;
}
