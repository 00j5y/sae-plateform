"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { CalendarEventType, CalendarFilters as FilterValues } from "@/lib/calendar/types";
import type { KanbanMember, Project } from "@/lib/kanban/types";

type Props = { projects: Project[]; members: KanbanMember[]; value: FilterValues };

const types: Array<{ value: CalendarEventType; label: string }> = [
  { value: "dev", label: "Développement" }, { value: "testing", label: "Tests" },
  { value: "bugfix", label: "Correction" }, { value: "meeting", label: "Réunion" }, { value: "deadline", label: "Rendu" }
];

export function CalendarFilters({ projects, members, value }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const update = (key: "project" | "member" | "type" | "q" | "hideDone", next: string | boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "" || next === false) params.delete(key); else params.set(key, String(next));
    router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  };
  return (
    <fieldset className="calendar-filters">
      <legend>Filtrer le calendrier</legend>
      <label>SAE
        <select aria-label="SAE" value={value.projectId ?? ""} onChange={(event) => update("project", event.target.value)}>
          <option value="">Toutes les SAE</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
      <label>Membre
        <select aria-label="Membre" value={value.memberId ?? ""} onChange={(event) => update("member", event.target.value)}>
          <option value="">Tous les membres</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
      </label>
      <label>Type
        <select aria-label="Type" value={value.type ?? ""} onChange={(event) => update("type", event.target.value)}>
          <option value="">Tous les types</option>{types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
      </label>
      <label className="filter-search">Rechercher
        <input aria-label="Rechercher" maxLength={160} onChange={(event) => update("q", event.target.value)} placeholder="Titre d’un événement" type="search" value={value.query ?? ""} />
      </label>
      <label className="checkbox-label calendar-hide-done"><input aria-label="Masquer les éléments terminés" checked={value.hideDone ?? false} onChange={(event) => update("hideDone", event.target.checked)} type="checkbox" /> Masquer les éléments terminés</label>
    </fieldset>
  );
}
