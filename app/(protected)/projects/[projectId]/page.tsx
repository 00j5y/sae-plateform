import { notFound, redirect } from "next/navigation";

import { KanbanBoard } from "@/components/kanban/kanban-board";
import { getCurrentMemberAccess } from "@/lib/auth/access";
import { getKanbanData } from "@/lib/kanban/data";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const access = await getCurrentMemberAccess();
  if (!access) redirect("/login");
  if (access.status !== "active") redirect("/pending");
  const { projectId } = await params;
  const data = await getKanbanData(projectId);
  const project = data.projects[0];
  if (!project) notFound();
  return (
    <main className="kanban-page">
      <div className="page-heading"><div><p className="eyebrow">SAE</p><h1>{project.name}</h1><p>{project.description || "Aucune description."}</p><p>Du {project.startsOn ?? "—"} au {project.endsOn ?? "—"}</p></div>
        <aside aria-label="Membres du projet"><strong>Membres</strong><ul>{data.members.map((member) => <li key={member.id}>{member.name}</li>)}</ul></aside>
      </div>
      <KanbanBoard {...data} currentUserId={access.userId} projectId={project.id} />
    </main>
  );
}
