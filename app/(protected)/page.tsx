import { redirect } from "next/navigation";

import { DashboardOverview } from "@/components/dashboard/overview";
import { destinationForStatus, getCurrentMemberAccess } from "@/lib/auth/access";
import { getCalendarData } from "@/lib/calendar/data";
import { parseCalendarFilters } from "@/lib/calendar/query";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const access = await getCurrentMemberAccess();

  if (!access) {
    redirect("/login");
  }

  if (access.status !== "active") {
    redirect(destinationForStatus(access.status));
  }

  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string") params.set(key, value);
  return <DashboardOverview {...await getCalendarData()} filters={parseCalendarFilters(params)} />;
}
