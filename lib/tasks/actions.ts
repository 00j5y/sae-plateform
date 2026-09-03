"use server";

import "server-only";

import { getCurrentMemberAccess } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { taskInputFromFormData, taskSchema } from "@/lib/validations/task";
import { nextPosition } from "@/lib/tasks/reorder";
import { z } from "zod";

type TaskSummary = {
  id: string;
  title: string;
};

export type TaskActionResult =
  | { ok: true; task: TaskSummary }
  | { ok: false; message: string };

export type ReorderTaskInput = {
  taskId: string;
  targetColumnId: string;
  beforeTaskId: string | null;
  afterTaskId: string | null;
};

export type ReorderTaskResult = { ok: true } | { ok: false; message: string };

const reorderTaskSchema = z.object({
  taskId: z.string().uuid(),
  targetColumnId: z.string().uuid(),
  beforeTaskId: z.string().uuid().nullable(),
  afterTaskId: z.string().uuid().nullable()
}).refine((input) => input.taskId !== input.beforeTaskId && input.taskId !== input.afterTaskId, {
  message: "Une tâche ne peut pas être sa propre voisine."
});

type ActiveCaller = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
};

async function getActiveCaller(): Promise<ActiveCaller | null> {
  const access = await getCurrentMemberAccess();
  if (!access || access.status !== "active") {
    return null;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== access.userId) {
    return null;
  }

  return { supabase, userId: user.id };
}

async function isProjectMember(caller: ActiveCaller, projectId: string) {
  const { data, error } = await caller.supabase
    .from("project_members")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("profile_id", caller.userId)
    .maybeSingle();

  return !error && Boolean(data);
}

async function assigneesBelongToProject(caller: ActiveCaller, projectId: string, assigneeIds: string[]) {
  if (assigneeIds.length === 0) {
    return true;
  }

  const { data, error } = await caller.supabase
    .from("project_members")
    .select("profile_id")
    .eq("project_id", projectId)
    .in("profile_id", assigneeIds);

  if (error) {
    return false;
  }

  const memberships = (data ?? []) as Array<{ profile_id: string }>;
  const memberIds = new Set(memberships.map((membership) => membership.profile_id));

  return assigneeIds.every((assigneeId) => memberIds.has(assigneeId));
}

export async function createTask(formData: FormData): Promise<TaskActionResult> {
  try {
    const caller = await getActiveCaller();
    if (!caller) {
      return { ok: false, message: "Seuls les membres actifs connectés peuvent créer une tâche." };
    }

    const parsed = taskSchema.safeParse(taskInputFromFormData(formData));
    if (!parsed.success) {
      return { ok: false, message: "Les informations de la tâche sont invalides." };
    }

    if (!await isProjectMember(caller, parsed.data.projectId)) {
      return { ok: false, message: "Vous n’êtes pas membre de ce projet." };
    }

    const { data: column, error: columnError } = await caller.supabase
      .from("kanban_columns")
      .select("id")
      .eq("id", parsed.data.columnId)
      .maybeSingle();

    if (columnError || !column) {
      return { ok: false, message: "La colonne sélectionnée est introuvable." };
    }

    if (!await assigneesBelongToProject(caller, parsed.data.projectId, parsed.data.assigneeIds)) {
      return { ok: false, message: "Chaque membre assigné doit appartenir au projet." };
    }

    const { data: task, error: taskError } = await caller.supabase.rpc("create_task_with_assignees", {
      p_project_id: parsed.data.projectId,
      p_column_id: parsed.data.columnId,
      p_title: parsed.data.title,
      p_description: parsed.data.description,
      p_color: parsed.data.color,
      p_due_at: parsed.data.dueAt,
      p_assignee_ids: parsed.data.assigneeIds
    });

    const createdTask = task as TaskSummary | null;
    if (taskError || !createdTask) {
      return { ok: false, message: "Impossible de créer la tâche pour le moment." };
    }

    return { ok: true, task: { id: createdTask.id, title: createdTask.title } };
  } catch {
    return { ok: false, message: "Impossible de créer la tâche pour le moment." };
  }
}

export async function createTaskAction(
  _previousState: TaskActionResult | null,
  formData: FormData
): Promise<TaskActionResult> {
  return createTask(formData);
}

export async function reorderTask(input: ReorderTaskInput): Promise<ReorderTaskResult> {
  try {
    const caller = await getActiveCaller();
    const parsed = reorderTaskSchema.safeParse(input);
    if (!caller || !parsed.success) {
      return { ok: false, message: "Le déplacement de la tâche est invalide." };
    }

    const { data: task, error: taskError } = await caller.supabase
      .from("tasks")
      .select("id, project_id")
      .eq("id", parsed.data.taskId)
      .maybeSingle();
    const currentTask = task as { id: string; project_id: string } | null;
    if (taskError || !currentTask || !await isProjectMember(caller, currentTask.project_id)) {
      return { ok: false, message: "Vous n’êtes pas autorisé à déplacer cette tâche." };
    }

    const { data: column, error: columnError } = await caller.supabase
      .from("kanban_columns")
      .select("id")
      .eq("id", parsed.data.targetColumnId)
      .maybeSingle();
    if (columnError || !column) {
      return { ok: false, message: "La colonne cible est introuvable." };
    }

    const neighbourIds = [parsed.data.beforeTaskId, parsed.data.afterTaskId].filter(Boolean) as string[];
    const { data: neighbours, error: neighbourError } = neighbourIds.length
      ? await caller.supabase
        .from("tasks")
        .select("id, project_id, column_id, position")
        .in("id", neighbourIds)
      : { data: [], error: null };
    const rows = (neighbours ?? []) as Array<{ id: string; project_id: string; column_id: string; position: number }>;
    if (neighbourError || rows.length !== neighbourIds.length || rows.some((row) =>
      row.project_id !== currentTask.project_id || row.column_id !== parsed.data.targetColumnId
    )) {
      return { ok: false, message: "La position cible est invalide." };
    }

    const before = rows.find((row) => row.id === parsed.data.beforeTaskId)?.position ?? null;
    const after = rows.find((row) => row.id === parsed.data.afterTaskId)?.position ?? null;
    const { error: updateError } = await caller.supabase
      .from("tasks")
      .update({ column_id: parsed.data.targetColumnId, position: nextPosition(before, after) })
      .eq("id", currentTask.id);

    if (updateError) {
      return { ok: false, message: "Impossible d’enregistrer le déplacement." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Impossible d’enregistrer le déplacement." };
  }
}
