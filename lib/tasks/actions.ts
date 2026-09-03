"use server";

import "server-only";

import { getCurrentMemberAccess } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { nextPosition } from "@/lib/tasks/reorder";
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

function numericPosition(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
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

    const { data: lastTask, error: positionError } = await caller.supabase
      .from("tasks")
      .select("position")
      .eq("project_id", parsed.data.projectId)
      .eq("column_id", parsed.data.columnId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (positionError) {
      return { ok: false, message: "Impossible de créer la tâche pour le moment." };
    }

    const previousPosition = numericPosition((lastTask as { position?: unknown } | null)?.position);
    const position = nextPosition(previousPosition, null);

    const { data: task, error: taskError } = await caller.supabase
      .from("tasks")
      .insert({
        project_id: parsed.data.projectId,
        column_id: parsed.data.columnId,
        title: parsed.data.title,
        description: parsed.data.description,
        color: parsed.data.color,
        due_at: parsed.data.dueAt,
        position,
        created_by: caller.userId
      })
      .select("id, title")
      .maybeSingle();

    const createdTask = task as TaskSummary | null;
    if (taskError || !createdTask) {
      return { ok: false, message: "Impossible de créer la tâche pour le moment." };
    }

    if (parsed.data.assigneeIds.length > 0) {
      const { error: assigneeError } = await caller.supabase
        .from("task_assignees")
        .insert(parsed.data.assigneeIds.map((profileId) => ({
          task_id: createdTask.id,
          profile_id: profileId
        })));

      if (assigneeError) {
        return { ok: false, message: "La tâche a été créée, mais les assignations n’ont pas pu être ajoutées." };
      }
    }

    return { ok: true, task: { id: createdTask.id, title: createdTask.title } };
  } catch {
    return { ok: false, message: "Impossible de créer la tâche pour le moment." };
  }
}
