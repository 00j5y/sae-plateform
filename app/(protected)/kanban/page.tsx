import { redirect } from "next/navigation";

import { KanbanBoard } from "@/components/kanban/kanban-board";
import { getCurrentMemberAccess } from "@/lib/auth/access";
import { getKanbanData } from "@/lib/kanban/data";

export default async function KanbanPage() {
  const access = await getCurrentMemberAccess();
  if (!access) redirect("/login");
  if (access.status !== "active") redirect("/pending");
  const data = await getKanbanData();
  return (
    <main className="kanban-page">
      <div className="page-heading"><div><p className="eyebrow">Collaboration</p><h1>Kanban</h1><p>Organisez les tâches de toutes vos SAE.</p></div></div>
      <KanbanBoard {...data} currentUserId={access.userId} />
    </main>
  );
}
