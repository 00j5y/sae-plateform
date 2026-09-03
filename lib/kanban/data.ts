import "server-only";

import type { KanbanColumn, KanbanMember, KanbanTask, Project, TaskAttachment, TaskComment } from "@/lib/kanban/types";
import { getE2eKanbanData, isE2eFixtureMode } from "@/lib/kanban/e2e-fixture";
import { createClient } from "@/lib/supabase/server";

type RawProfile = { id: string; username: string; display_name: string | null };
type RawTask = {
  id: string; project_id: string; column_id: string; title: string; description: string;
  color: string; due_at: string | null; position: number;
  task_assignees: Array<{ profile_id: string }> | null;
  task_comments: Array<{ id: string; author_id: string; body: string; created_at: string }> | null;
  task_attachments: Array<{ id: string; filename: string; mime_type: string; size_bytes: number; created_at: string; uploaded_by: string }> | null;
};

export type KanbanData = {
  projects: Project[];
  columns: KanbanColumn[];
  members: KanbanMember[];
  tasks: KanbanTask[];
};

function nameFor(profile: RawProfile | undefined) {
  return profile?.display_name || profile?.username || "Membre";
}

export async function getKanbanData(projectId?: string): Promise<KanbanData> {
  if (isE2eFixtureMode()) return getE2eKanbanData(projectId);
  const supabase = await createClient();
  let taskQuery = supabase
    .from("tasks")
    .select("id, project_id, column_id, title, description, color, due_at, position, task_assignees(profile_id), task_comments(id, author_id, body, created_at), task_attachments(id, filename, mime_type, size_bytes, created_at, uploaded_by)")
    .order("position", { ascending: true });
  let projectQuery = supabase
    .from("projects")
    .select("id, name, description, color, starts_on, ends_on")
    .order("created_at", { ascending: true });
  if (projectId) {
    taskQuery = taskQuery.eq("project_id", projectId);
    projectQuery = projectQuery.eq("id", projectId);
  }
  let membershipQuery = supabase.from("project_members").select("project_id, profile_id");
  if (projectId) membershipQuery = membershipQuery.eq("project_id", projectId);
  const [projectsResult, columnsResult, tasksResult, profilesResult, membershipsResult] = await Promise.all([
    projectQuery,
    supabase.from("kanban_columns").select("id, name, position").order("position", { ascending: true }),
    taskQuery,
    supabase.from("profiles").select("id, username, display_name").eq("status", "active").order("username", { ascending: true }),
    membershipQuery
  ]);
  if (projectsResult.error || columnsResult.error || tasksResult.error || profilesResult.error || membershipsResult.error) {
    throw new Error("Impossible de charger le Kanban pour le moment.");
  }

  const profiles = (profilesResult.data ?? []) as RawProfile[];
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const visibleMemberIds = new Set((membershipsResult.data ?? []).map((membership) => membership.profile_id));
  const members = profiles.filter((profile) => visibleMemberIds.has(profile.id)).map((profile) => ({ id: profile.id, username: profile.username, name: nameFor(profile) }));
  const tasks = ((tasksResult.data ?? []) as RawTask[]).map((task) => ({
    id: task.id,
    projectId: task.project_id,
    columnId: task.column_id,
    title: task.title,
    description: task.description,
    color: task.color,
    dueAt: task.due_at,
    position: task.position,
    assignees: (task.task_assignees ?? []).map((assignee) => {
      const profile = profilesById.get(assignee.profile_id);
      return { id: assignee.profile_id, username: profile?.username ?? "membre", name: nameFor(profile) };
    }),
    comments: (task.task_comments ?? []).map((comment): TaskComment => {
      const profile = profilesById.get(comment.author_id);
      return { id: comment.id, authorId: comment.author_id, authorName: nameFor(profile), body: comment.body, createdAt: comment.created_at };
    }),
    attachments: (task.task_attachments ?? []).map((attachment): TaskAttachment => ({
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mime_type,
      sizeBytes: attachment.size_bytes, createdAt: attachment.created_at, uploadedBy: attachment.uploaded_by
    }))
  }));

  return {
    projects: (projectsResult.data ?? []).map((project) => ({
      id: project.id, name: project.name, description: project.description, color: project.color,
      startsOn: project.starts_on, endsOn: project.ends_on
    })),
    columns: (columnsResult.data ?? []).map((column) => ({ id: column.id, name: column.name, position: Number(column.position) })),
    members,
    tasks
  };
}
