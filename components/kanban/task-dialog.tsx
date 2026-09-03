"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { AttachmentUploader } from "@/components/tasks/attachment-uploader";
import { CommentThread } from "@/components/tasks/comment-thread";
import type { KanbanColumn, KanbanMember, KanbanTask, Project } from "@/lib/kanban/types";
import { createTaskAction, type TaskActionResult } from "@/lib/tasks/actions";

const initialState: TaskActionResult | null = null;

type Props = {
  open: boolean;
  mode: "create" | "details";
  task?: KanbanTask;
  projects: Project[];
  columns: KanbanColumn[];
  members: KanbanMember[];
  currentUserId: string;
  defaultProjectId?: string;
  defaultColumnId?: string;
  onClose: () => void;
};

export function TaskDialog({ open, mode, task, projects, columns, members, currentUserId, defaultProjectId, defaultColumnId, onClose }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createTaskAction, initialState);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [onClose, router, state]);
  if (!open) return null;
  if (mode === "details" && task) {
    const project = projects.find((item) => item.id === task.projectId);
    return (
      <div aria-labelledby="task-details-title" aria-modal="true" className="dialog-backdrop" role="dialog">
        <section className="task-dialog">
          <button aria-label="Fermer les détails" className="dialog-close" onClick={onClose} type="button">×</button>
          <p className="eyebrow">{project?.name ?? "SAE"}</p>
          <h2 id="task-details-title">{task.title}</h2>
          {task.description ? <p>{task.description}</p> : <p className="muted">Aucune description.</p>}
          <p>Échéance : {task.dueAt ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" }).format(new Date(task.dueAt)) : "Sans échéance"}</p>
          <p>Assigné·e·s : {task.assignees.length ? task.assignees.map((member) => member.name).join(", ") : "Personne"}</p>
          <CommentThread comments={task.comments} currentUserId={currentUserId} taskId={task.id} />
          <AttachmentUploader attachments={task.attachments} currentUserId={currentUserId} projectId={task.projectId} taskId={task.id} />
        </section>
      </div>
    );
  }
  return (
    <div aria-labelledby="new-task-title" aria-modal="true" className="dialog-backdrop" role="dialog">
      <section className="task-dialog">
        <button aria-label="Fermer la création" className="dialog-close" onClick={onClose} type="button">×</button>
        <p className="eyebrow">Kanban</p>
        <h2 id="new-task-title">Nouvelle tâche</h2>
        {projects.length === 0 || columns.length === 0 ? <p className="form-error" role="alert">Créez d’abord une SAE et vérifiez les colonnes Kanban.</p> : null}
        <form action={formAction} className="task-form">
          <label>
            SAE
            <select defaultValue={defaultProjectId ?? projects[0]?.id} name="projectId" required>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
          </label>
          <label>
            Colonne
            <select defaultValue={defaultColumnId ?? columns[0]?.id} name="columnId" required>{columns.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}</select>
          </label>
          <label>
            Titre
            <input autoFocus maxLength={160} name="title" required type="text" />
          </label>
          <label>
            Description
            <textarea maxLength={10_000} name="description" rows={4} />
          </label>
          <label>
            Couleur
            <input defaultValue="#6D4AFF" name="color" type="color" />
          </label>
          <label>
            Échéance
            <input name="dueAt" type="datetime-local" />
          </label>
          <fieldset>
            <legend>Assigné·e·s</legend>
            {members.map((member) => <label className="checkbox-label" key={member.id}><input name="assigneeIds" type="checkbox" value={member.id} /> {member.name}</label>)}
          </fieldset>
          {state && !state.ok ? <p className="form-error" role="alert">{state.message}</p> : null}
          <p aria-live="polite" className="form-status">{isPending ? "Création en cours…" : ""}</p>
          <button className="primary-button" disabled={isPending || projects.length === 0 || columns.length === 0} type="submit">Créer la tâche</button>
        </form>
      </section>
    </div>
  );
}
