"use server";

import "server-only";

import { getCurrentMemberAccess } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { taskInputFromFormData, taskSchema } from "@/lib/validations/task";

type TaskSummary = {
  id: string;
  title: string;
};

export type TaskActionResult =
  | { ok: true; task: TaskSummary }
  | { ok: false; message: string };

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
