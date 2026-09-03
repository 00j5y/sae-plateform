"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCorners, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { KanbanFilters } from "@/components/kanban/kanban-filters";
import { TaskCard } from "@/components/kanban/task-card";
import { TaskDialog } from "@/components/kanban/task-dialog";
import type { KanbanColumn, KanbanMember, KanbanTask, Project } from "@/lib/kanban/types";
import { filterKanbanTasks, type KanbanFilterValues } from "@/lib/kanban/utils";
import { reorderTask } from "@/lib/tasks/actions";

type Props = {
  projects: Project[];
  columns: KanbanColumn[];
  members: KanbanMember[];
  tasks: KanbanTask[];
  currentUserId: string;
  projectId?: string;
};

function KanbanColumnLane({ column, tasks, projects, onOpen }: { column: KanbanColumn; tasks: KanbanTask[]; projects: Project[]; onOpen: (task: KanbanTask) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <section aria-label={`Colonne ${column.name}`} className="kanban-column" data-over={isOver || undefined} ref={setNodeRef}>
      <header><h2>{column.name}</h2><span>{tasks.length}</span></header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="task-stack">{tasks.map((task) => <TaskCard key={task.id} onOpen={onOpen} project={projects.find((project) => project.id === task.projectId)} task={task} />)}</div>
      </SortableContext>
    </section>
  );
}

export function KanbanBoard({ projects, columns, members, tasks, currentUserId, projectId }: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState<KanbanFilterValues>({ projectId: projectId ?? "all", memberId: "all", columnId: "all", due: "all", color: "all", query: "" });
  const [dialog, setDialog] = useState<"create" | "details" | null>(null);
  const [selectedTask, setSelectedTask] = useState<KanbanTask>();
  const [activeColumn, setActiveColumn] = useState(columns[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const filteredTasks = useMemo(() => filterKanbanTasks(tasks.map((task) => ({ ...task, assigneeIds: task.assignees.map((member) => member.id) })), filters), [filters, tasks]);
  const visibleColumns = filters.columnId === "all" ? columns : columns.filter((column) => column.id === filters.columnId);
  const openTask = (task: KanbanTask) => { setSelectedTask(task); setDialog("details"); };
  const closeDialog = () => { setDialog(null); setSelectedTask(undefined); };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const activeTask = tasks.find((task) => task.id === active.id);
    if (!activeTask) return;
    const overTask = tasks.find((task) => task.id === over.id);
    const targetColumnId = overTask?.columnId ?? columns.find((column) => column.id === over.id)?.id;
    if (!targetColumnId) return;
    const targetTasks = tasks.filter((task) => task.columnId === targetColumnId && task.id !== activeTask.id).sort((a, b) => a.position - b.position);
    const overIndex = overTask ? targetTasks.findIndex((task) => task.id === overTask.id) : targetTasks.length;
    const beforeTaskId = overIndex > 0 ? targetTasks[overIndex - 1]?.id ?? null : null;
    const afterTaskId = overIndex < targetTasks.length ? targetTasks[overIndex]?.id ?? null : null;
    startTransition(async () => {
      const result = await reorderTask({ taskId: activeTask.id, targetColumnId, beforeTaskId, afterTaskId });
      setMessage(result.ok ? "Tâche déplacée." : result.message);
      if (result.ok) router.refresh();
    });
  };
  return (
    <section className="kanban-shell" aria-label="Tableau Kanban">
      <div className="kanban-toolbar">
        <KanbanFilters columns={columns} lockProject={Boolean(projectId)} members={members} onChange={setFilters} projects={projects} value={filters} />
        <button className="primary-button" onClick={() => setDialog("create")} type="button">Nouvelle tâche</button>
      </div>
      <p aria-live="polite" className="form-status">{message}</p>
      <div aria-label="Choisir une colonne sur mobile" className="column-carousel">
        {visibleColumns.map((column) => <button aria-pressed={activeColumn === column.id} key={column.id} onClick={() => setActiveColumn(column.id)} type="button">{column.name}</button>)}
      </div>
      <DndContext accessibility={{ announcements: {
        onDragStart: ({ active }) => `Déplacement de ${tasks.find((task) => task.id === active.id)?.title ?? "la tâche"}.`,
        onDragOver: ({ over }) => over ? "Position de dépôt disponible." : "Aucune position de dépôt.",
        onDragEnd: () => "Déplacement terminé.",
        onDragCancel: () => "Déplacement annulé."
      } }} collisionDetection={closestCorners} onDragEnd={onDragEnd} sensors={sensors}>
        <div className="kanban-columns">
          {visibleColumns.map((column) => <div className="kanban-column-wrapper" data-mobile-hidden={activeColumn !== column.id || undefined} key={column.id}><KanbanColumnLane column={column} onOpen={openTask} projects={projects} tasks={filteredTasks.filter((task) => task.columnId === column.id)} /></div>)}
        </div>
      </DndContext>
      {dialog ? <TaskDialog columns={columns} currentUserId={currentUserId} defaultColumnId={activeColumn} defaultProjectId={projectId} members={members} mode={dialog === "details" ? "details" : "create"} onAnnounce={setMessage} onClose={closeDialog} open projects={projects} task={selectedTask} /> : null}
    </section>
  );
}
