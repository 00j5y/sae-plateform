"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getCurrentMemberAccess } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { calendarEventSchema, type CalendarEventInput } from "@/lib/validations/calendar-event";
import { toCalendarItem, parseCalendarFilters } from "@/lib/calendar/query";
import type { CalendarItem } from "@/lib/calendar/types";

export type CalendarActionResult<T = unknown> = { ok: true; data: T } | { ok: false; message: string };
type Caller = { supabase: Awaited<ReturnType<typeof createClient>>; userId: string };

async function caller(): Promise<Caller | null> {
  const access = await getCurrentMemberAccess();
  if (!access || access.status !== "active") return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && user.id === access.userId ? { supabase, userId: user.id } : null;
}

async function memberOf(c: Caller, projectId: string) {
  const { data, error } = await c.supabase.from("project_members").select("project_id").eq("project_id", projectId).eq("profile_id", c.userId).maybeSingle();
  return !error && Boolean(data);
}

function dbType(type: CalendarEventInput["eventType"]) { return type === "dev" ? "development" : type; }

export async function getCalendarEvents(search?: URLSearchParams): Promise<CalendarActionResult<CalendarItem[]>> {
  try {
    const c = await caller();
    if (!c) return { ok: false, message: "Seuls les membres actifs connectés peuvent consulter le calendrier." };
    const filters = search ? parseCalendarFilters(search) : {};
    let query = c.supabase.from("calendar_events").select("id,title,project_id,event_type,starts_at,ends_at,description,created_by").order("starts_at");
    if (filters.projectId) query = query.eq("project_id", filters.projectId);
    if (filters.type) query = query.eq("event_type", dbType(filters.type));
    const { data, error } = await query;
    if (error) return { ok: false, message: "Impossible de charger le calendrier pour le moment." };
    const items = (data ?? []).map((row) => toCalendarItem({ ...row, member_ids: [row.created_by] } as Record<string, unknown>, "event")).filter((item): item is CalendarItem => item !== null);
    const memberItems = filters.memberId ? items.filter((item) => item.memberIds.includes(filters.memberId!)) : items;
    return { ok: true, data: filters.query ? memberItems.filter((item) => item.title.toLocaleLowerCase().includes(filters.query!.toLocaleLowerCase())) : memberItems };
  } catch { return { ok: false, message: "Impossible de charger le calendrier pour le moment." }; }
}

export async function createCalendarEvent(input: unknown): Promise<CalendarActionResult<{ id: string }>> {
  try {
    const parsed = calendarEventSchema.safeParse(input);
    const c = await caller();
    if (!parsed.success) return { ok: false, message: "Les informations de l’événement sont invalides." };
    if (!c) return { ok: false, message: "Seuls les membres actifs connectés peuvent gérer le calendrier." };
    if (!await memberOf(c, parsed.data.projectId)) return { ok: false, message: "Vous n’êtes pas membre de ce projet." };
    const { data, error } = await c.supabase.from("calendar_events").insert({ project_id: parsed.data.projectId, title: parsed.data.title, event_type: dbType(parsed.data.eventType), starts_at: parsed.data.startsAt, ends_at: parsed.data.endsAt, description: parsed.data.description, created_by: c.userId }).select("id").single();
    if (error || !data) return { ok: false, message: "Impossible de créer l’événement pour le moment." };
    revalidatePath("/calendar");
    return { ok: true, data: { id: data.id } };
  } catch { return { ok: false, message: "Impossible de créer l’événement pour le moment." }; }
}

export async function updateCalendarEvent(id: string, input: unknown): Promise<CalendarActionResult<{ id: string }>> {
  try {
    const parsed = calendarEventSchema.safeParse(input);
    const c = await caller();
    if (!parsed.success) return { ok: false, message: "Les informations de l’événement sont invalides." };
    if (!c || !await memberOf(c, parsed.data.projectId)) return { ok: false, message: "Vous n’êtes pas autorisé à modifier cet événement." };
    const { data, error } = await c.supabase.from("calendar_events").update({ project_id: parsed.data.projectId, title: parsed.data.title, event_type: dbType(parsed.data.eventType), starts_at: parsed.data.startsAt, ends_at: parsed.data.endsAt, description: parsed.data.description }).eq("id", id).select("id").maybeSingle();
    if (error || !data) return { ok: false, message: "Impossible de modifier l’événement pour le moment." };
    revalidatePath("/calendar"); return { ok: true, data: { id: data.id } };
  } catch { return { ok: false, message: "Impossible de modifier l’événement pour le moment." }; }
}

export async function deleteCalendarEvent(id: string): Promise<CalendarActionResult> {
  try {
    const c = await caller(); if (!c) return { ok: false, message: "Seuls les membres actifs connectés peuvent gérer le calendrier." };
    const { data: event } = await c.supabase.from("calendar_events").select("project_id").eq("id", id).maybeSingle();
    if (!event || !await memberOf(c, event.project_id)) return { ok: false, message: "Vous n’êtes pas autorisé à supprimer cet événement." };
    const { error } = await c.supabase.from("calendar_events").delete().eq("id", id);
    if (error) return { ok: false, message: "Impossible de supprimer l’événement pour le moment." };
    revalidatePath("/calendar"); return { ok: true, data: undefined };
  } catch { return { ok: false, message: "Impossible de supprimer l’événement pour le moment." }; }
}
