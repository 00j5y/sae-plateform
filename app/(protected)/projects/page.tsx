import { redirect } from "next/navigation";
import Link from "next/link";

import { ProjectForm } from "@/components/projects/project-form";
import { getCurrentMemberAccess } from "@/lib/auth/access";
import { getKanbanData } from "@/lib/kanban/data";

export default async function ProjectsPage() {
  const access = await getCurrentMemberAccess();
  if (!access) redirect("/login");
  if (access.status !== "active") redirect("/pending");
  const { projects } = await getKanbanData();
  return (
    <main className="page-content projects-page">
      <p className="eyebrow">SAE</p><h1>Projets</h1><p>Créez une SAE puis partagez ses tâches avec les membres concernés.</p>
      <section className="project-create"><h2>Nouvelle SAE</h2><ProjectForm /></section>
      <section aria-labelledby="projects-list"><h2 id="projects-list">Vos SAE</h2>
        {projects.length ? <ul className="project-list">{projects.map((project) => <li key={project.id} style={{ borderInlineStartColor: project.color }}><Link href={`/projects/${project.id}`}><strong>{project.name}</strong><span>{project.description || "Aucune description"}</span></Link></li>)}</ul> : <p>Vous n’êtes encore membre d’aucune SAE.</p>}
      </section>
    </main>
  );
}
