"use client";

import type { KanbanColumn, KanbanMember, Project } from "@/lib/kanban/types";
import type { KanbanFilterValues } from "@/lib/kanban/utils";

type Props = {
  columns: KanbanColumn[];
  members: KanbanMember[];
  projects: Project[];
  value: KanbanFilterValues;
  onChange: (next: KanbanFilterValues) => void;
  lockProject?: boolean;
};

export function KanbanFilters({ columns, members, projects, value, onChange, lockProject = false }: Props) {
  const update = (key: keyof KanbanFilterValues, next: string) => onChange({ ...value, [key]: next });
  return (
    <fieldset className="kanban-filters">
      <legend>Filtrer les tâches</legend>
      <label>
        SAE
        <select aria-label="SAE" disabled={lockProject} value={value.projectId} onChange={(event) => update("projectId", event.target.value)}>
          <option value="all">Toutes les SAE</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
      <label>
        Membre
        <select aria-label="Membre" value={value.memberId} onChange={(event) => update("memberId", event.target.value)}>
          <option value="all">Tous les membres</option>
          {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
      </label>
      <label>
        Colonne
        <select aria-label="Colonne" value={value.columnId} onChange={(event) => update("columnId", event.target.value)}>
          <option value="all">Toutes les colonnes</option>
          {columns.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}
        </select>
      </label>
      <label>
        Échéance
        <select aria-label="Échéance" value={value.due} onChange={(event) => update("due", event.target.value)}>
          <option value="all">Toutes</option><option value="upcoming">Avec échéance</option><option value="none">Sans échéance</option>
        </select>
      </label>
      <label>
        Couleur
        <select aria-label="Couleur" value={value.color} onChange={(event) => update("color", event.target.value)}>
          <option value="all">Toutes les couleurs</option>
          <option value="#6D4AFF">Violet</option><option value="#00AA55">Vert</option><option value="#E06C00">Orange</option><option value="#D70015">Rouge</option>
        </select>
      </label>
      <label className="filter-search">
        Rechercher
        <input aria-label="Rechercher" type="search" value={value.query} onChange={(event) => update("query", event.target.value)} placeholder="Titre d’une tâche" />
      </label>
    </fieldset>
  );
}
