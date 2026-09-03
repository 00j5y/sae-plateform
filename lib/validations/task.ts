import { z } from "zod";

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const taskSchema = z.object({
  projectId: z.string().uuid(),
  columnId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  description: z.string().max(10_000).default(""),
  color: hexColorSchema.default("#6D4AFF"),
  dueAt: z.string().datetime({ offset: true }).nullable(),
  assigneeIds: z.array(z.string().uuid())
    .refine((ids) => new Set(ids).size === ids.length, "Un membre ne peut être assigné qu’une fois.")
    .default([])
});

type TaskFormDataInput = {
  projectId: FormDataEntryValue | null;
  columnId: FormDataEntryValue | null;
  title: FormDataEntryValue | null;
  description: FormDataEntryValue | undefined;
  color: FormDataEntryValue | undefined;
  dueAt: FormDataEntryValue | null;
  assigneeIds: FormDataEntryValue[];
};

function emptyValueAsNull(value: FormDataEntryValue | null) {
  if (value === "") return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }
  return value;
}

export function taskInputFromFormData(formData: FormData): TaskFormDataInput {
  return {
    projectId: formData.get("projectId"),
    columnId: formData.get("columnId"),
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    color: formData.get("color") ?? undefined,
    dueAt: emptyValueAsNull(formData.get("dueAt")),
    assigneeIds: formData.getAll("assigneeIds")
  };
}
