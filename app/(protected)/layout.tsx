import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getCurrentMemberAccess } from "@/lib/auth/access";

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const access = await getCurrentMemberAccess();

  if (!access) {
    redirect("/login");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/">SAE Platform</Link>
        {access.status === "active" ? (
          <nav aria-label="Navigation principale">
            <Link href="/members">Membres</Link>
          </nav>
        ) : null}
      </header>
      {children}
    </div>
  );
}
