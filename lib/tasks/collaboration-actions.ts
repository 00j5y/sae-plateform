"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentMemberAccess } from "@/lib/auth/access";
import { taskImageConstraints } from "@/lib/kanban/utils";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; message: string };

type Caller = { supabase: Awaited<ReturnType<typeof createClient>>; userId: string };
const uuidSchema = z.string().uuid();
const commentSchema = z.object({ taskId: uuidSchema, body: z.string().trim().min(1).max(5000) });
const uploadSchema = z.object({
  projectId: uuidSchema,
  taskId: uuidSchema,
  path: z.string().min(1).max(1024),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  sizeBytes: z.number().int().positive().max(taskImageConstraints.maxSize)
});

async function activeCaller(): Promise<Caller | null> {
  const access = await getCurrentMemberAccess();
  if (!access || access.status !== "active") return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id === access.userId ? { supabase, userId: user.id } : null;
}

async function memberTask(caller: Caller, taskId: string) {
  const { data, error } = await caller.supabase
    .from("tasks")
    .select("id, project_id")
    .eq("id", taskId)
    .maybeSingle();
  const task = data as { id: string; project_id: string } | null;
  if (error || !task) return null;
  const { data: membership, error: membershipError } = await caller.supabase
    .from("project_members")
    .select("project_id")
    .eq("project_id", task.project_id)
    .eq("profile_id", caller.userId)
    .maybeSingle();
  return membershipError || !membership ? null : task;
}

export async function createTaskComment(input: { taskId: string; body: string }): Promise<Result> {
  try {
    const caller = await activeCaller();
    const parsed = commentSchema.safeParse(input);
    if (!caller || !parsed.success || !await memberTask(caller, parsed.data.taskId)) {
      return { ok: false, message: "Impossible d’ajouter ce commentaire." };
    }
    const { error } = await caller.supabase.from("task_comments").insert({
      task_id: parsed.data.taskId, author_id: caller.userId, body: parsed.data.body
    });
    if (error) return { ok: false, message: "Impossible d’ajouter ce commentaire." };
    revalidatePath("/kanban");
    return { ok: true };
  } catch {
    return { ok: false, message: "Impossible d’ajouter ce commentaire." };
  }
}

export async function deleteTaskComment(commentId: string): Promise<Result> {
  try {
    const caller = await activeCaller();
    if (!caller || !uuidSchema.safeParse(commentId).success) {
      return { ok: false, message: "Impossible de supprimer ce commentaire." };
    }
    const { data: comment, error } = await caller.supabase
      .from("task_comments")
      .select("id, task_id, author_id")
      .eq("id", commentId)
      .maybeSingle();
    const row = comment as { id: string; task_id: string; author_id: string } | null;
    if (error || !row || row.author_id !== caller.userId || !await memberTask(caller, row.task_id)) {
      return { ok: false, message: "Vous ne pouvez supprimer que vos propres commentaires." };
    }
    const { error: deleteError } = await caller.supabase.from("task_comments").delete().eq("id", row.id);
    if (deleteError) return { ok: false, message: "Impossible de supprimer ce commentaire." };
    revalidatePath("/kanban");
    return { ok: true };
  } catch {
    return { ok: false, message: "Impossible de supprimer ce commentaire." };
  }
}

export async function createAttachmentUpload(input: z.infer<typeof uploadSchema>) {
  try {
    const caller = await activeCaller();
    const parsed = uploadSchema.safeParse(input);
    if (!caller || !parsed.success || !parsed.data.path.startsWith(`${parsed.data.projectId}/${parsed.data.taskId}/`)) {
      return { ok: false as const, message: "Le fichier est invalide." };
    }
    const task = await memberTask(caller, parsed.data.taskId);
    if (!task || task.project_id !== parsed.data.projectId) return { ok: false as const, message: "Vous n’êtes pas autorisé à joindre ce fichier." };
    const { data, error } = await caller.supabase.storage.from("task-attachments").createSignedUploadUrl(parsed.data.path);
    if (error || !data) return { ok: false as const, message: "Impossible de préparer l’envoi du fichier." };
    return { ok: true as const, token: data.token, signedUrl: data.signedUrl };
  } catch {
    return { ok: false as const, message: "Impossible de préparer l’envoi du fichier." };
  }
}

export async function registerTaskAttachment(input: z.infer<typeof uploadSchema>): Promise<Result> {
  try {
    const caller = await activeCaller();
    const parsed = uploadSchema.safeParse(input);
    if (!caller || !parsed.success || !parsed.data.path.startsWith(`${parsed.data.projectId}/${parsed.data.taskId}/`)) {
      return { ok: false, message: "Le fichier est invalide." };
    }
    const task = await memberTask(caller, parsed.data.taskId);
    if (!task || task.project_id !== parsed.data.projectId) return { ok: false, message: "Vous n’êtes pas autorisé à joindre ce fichier." };
    const segments = parsed.data.path.split("/");
    const { data: storedFiles, error: listError } = await caller.supabase.storage.from("task-attachments")
      .list(`${parsed.data.projectId}/${parsed.data.taskId}`, { search: segments.at(-1) });
    const stored = storedFiles?.find((file) => file.name === segments.at(-1));
    if (listError || !stored || stored.metadata?.size !== parsed.data.sizeBytes || stored.metadata?.mimetype !== parsed.data.mimeType) {
      return { ok: false, message: "Le fichier envoyé ne correspond pas aux contrôles de sécurité." };
    }
    const { error } = await caller.supabase.from("task_attachments").insert({
      task_id: parsed.data.taskId,
      path: parsed.data.path,
      filename: parsed.data.filename,
      mime_type: parsed.data.mimeType,
      size_bytes: parsed.data.sizeBytes,
      uploaded_by: caller.userId
    });
    if (error) return { ok: false, message: "Impossible d’enregistrer la pièce jointe." };
    revalidatePath("/kanban");
    return { ok: true };
  } catch {
    return { ok: false, message: "Impossible d’enregistrer la pièce jointe." };
  }
}

export async function signedTaskAttachmentUrl(attachmentId: string) {
  try {
    const caller = await activeCaller();
    if (!caller || !uuidSchema.safeParse(attachmentId).success) return { ok: false as const, message: "Fichier introuvable." };
    const { data, error } = await caller.supabase
      .from("task_attachments")
      .select("id, path, task_id")
      .eq("id", attachmentId)
      .maybeSingle();
    const attachment = data as { id: string; path: string; task_id: string } | null;
    if (error || !attachment || !await memberTask(caller, attachment.task_id)) return { ok: false as const, message: "Fichier introuvable." };
    const { data: signed, error: signError } = await caller.supabase.storage.from("task-attachments").createSignedUrl(attachment.path, 60);
    if (signError || !signed) return { ok: false as const, message: "Impossible d’afficher cette image." };
    return { ok: true as const, url: signed.signedUrl };
  } catch {
    return { ok: false as const, message: "Impossible d’afficher cette image." };
  }
}

export async function deleteTaskAttachment(attachmentId: string): Promise<Result> {
  try {
    const caller = await activeCaller();
    if (!caller || !uuidSchema.safeParse(attachmentId).success) return { ok: false, message: "Impossible de supprimer ce fichier." };
    const { data, error } = await caller.supabase
      .from("task_attachments")
      .select("id, path, task_id, uploaded_by")
      .eq("id", attachmentId)
      .maybeSingle();
    const attachment = data as { id: string; path: string; task_id: string; uploaded_by: string } | null;
    if (error || !attachment || attachment.uploaded_by !== caller.userId || !await memberTask(caller, attachment.task_id)) {
      return { ok: false, message: "Vous ne pouvez supprimer que vos propres fichiers." };
    }
    const { error: objectError } = await caller.supabase.storage.from("task-attachments").remove([attachment.path]);
    if (objectError) return { ok: false, message: "Impossible de supprimer ce fichier." };
    const { error: rowError } = await caller.supabase.from("task_attachments").delete().eq("id", attachment.id);
    if (rowError) return { ok: false, message: "Impossible de supprimer ce fichier." };
    revalidatePath("/kanban");
    return { ok: true };
  } catch {
    return { ok: false, message: "Impossible de supprimer ce fichier." };
  }
}
