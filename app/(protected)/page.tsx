import { redirect } from "next/navigation";

import { destinationForStatus, getCurrentMemberAccess } from "@/lib/auth/access";

export default async function HomePage() {
  const access = await getCurrentMemberAccess();

  if (!access) {
    redirect("/login");
  }

  if (access.status !== "active") {
    redirect(destinationForStatus(access.status));
  }

  return (
    <main className="page-content">
      <p className="eyebrow">Tableau de bord</p>
      <h1>SAE Platform</h1>
      <p>Ton accès est actif. Les outils SAE arriveront ici.</p>
    </main>
  );
}
