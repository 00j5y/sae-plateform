import { z } from "zod";

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const isoDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "La date est invalide.");

const optionalDateSchema = isoDateSchema.nullable().optional().default(null);

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(10_000).default(""),
  color: hexColorSchema.default("#6D4AFF"),
  startsOn: optionalDateSchema,
  endsOn: optionalDateSchema
}).superRefine((project, context) => {
  if (project.startsOn && project.endsOn && project.endsOn < project.startsOn) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La date de fin ne peut pas précéder la date de début.",
      path: ["endsOn"]
    });
  }
});

export const projectMemberSchema = z.object({
  projectId: z.string().uuid(),
  profileId: z.string().uuid()
});

type ProjectFormDataInput = {
  name: FormDataEntryValue | null;
  description: FormDataEntryValue | undefined;
  color: FormDataEntryValue | undefined;
  startsOn: FormDataEntryValue | null;
  endsOn: FormDataEntryValue | null;
};

type ProjectMemberFormDataInput = {
  projectId: FormDataEntryValue | null;
  profileId: FormDataEntryValue | null;
};

function emptyValueAsNull(value: FormDataEntryValue | null) {
  return value === "" ? null : value;
}

export function projectInputFromFormData(formData: FormData): ProjectFormDataInput {
  return {
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    color: formData.get("color") ?? undefined,
    startsOn: emptyValueAsNull(formData.get("startsOn")),
    endsOn: emptyValueAsNull(formData.get("endsOn"))
  };
}

export function projectMemberInputFromFormData(formData: FormData): ProjectMemberFormDataInput {
  return {
    projectId: formData.get("projectId"),
    profileId: formData.get("profileId")
  };
}
