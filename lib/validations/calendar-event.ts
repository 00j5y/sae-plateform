import { z } from "zod";

export const calendarEventTypeSchema = z.enum(["dev", "testing", "bugfix", "meeting", "deadline"]);
export const calendarEventSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  eventType: calendarEventTypeSchema,
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  description: z.string().max(10_000).default(""),
}).refine((value) => new Date(value.endsAt).getTime() >= new Date(value.startsAt).getTime(), {
  message: "La date de fin doit être postérieure au début.", path: ["endsAt"]
});
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
