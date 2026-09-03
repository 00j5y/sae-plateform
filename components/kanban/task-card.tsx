"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, useReducedMotion } from "motion/react";

import type { KanbanTask, Project } from "@/lib/kanban/types";

type Props = { task: KanbanTask; project: Project | undefined; onOpen: (task: KanbanTask) => void };

export function TaskCard({ task, project, onOpen }: Props) {
  const reduceMotion = useReducedMotion();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const due = task.dueAt ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(task.dueAt)) : "Sans échéance";
  return (
    <motion.article
      ref={setNodeRef}
      className="task-card"
      data-dragging={isDragging || undefined}
      style={{ transform: CSS.Transform.toString(transform), transition, borderInlineStartColor: task.color }}
      layout={!reduceMotion}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 35, bounce: 0 }}
      {...attributes}
    >
      <div className="task-card-actions">
        <button aria-label={`Déplacer ${task.title}`} className="drag-handle" type="button" {...listeners}>⠿</button>
        <button className="task-card-open" type="button" onClick={() => onOpen(task)}>
          <strong>{task.title}</strong>
        </button>
      </div>
      <p className="task-project"><span aria-hidden="true" className="color-dot" style={{ backgroundColor: project?.color }} /> SAE : {project?.name ?? "SAE"}</p>
      <p className="task-meta">Échéance : {due}</p>
      <p className="task-assignees">Assigné·e·s : {task.assignees.length ? task.assignees.map((member) => member.name).join(", ") : "Personne"}</p>
    </motion.article>
  );
}
