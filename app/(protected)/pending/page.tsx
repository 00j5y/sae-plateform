import { redirect } from "next/navigation";

import { getCurrentMemberAccess } from "@/lib/auth/access";

export default async function PendingPage() {
  const access = await getCurrentMemberAccess();

  if (!access) {
    redirect("/login");
  }

  if (access.status === "active") {
    redirect("/");
  }

  return (
    <main className="page-content pending-page">
      <p className="eyebrow">SAE Platform</p>
      <h1>Accès en attente</h1>
      <p>Un membre actif doit valider ton accès avant que tu puisses rejoindre l’espace de travail.</p>
    </main>
  );
}
