import { redirect } from "next/navigation";

import { ActivateMemberForm } from "@/components/members/activate-member-form";
import { getCurrentMemberAccess } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  avatar_url: string | null;
  display_name: string | null;
  id: string;
  status: "pending" | "active";
  username: string;
};

export default async function MembersPage() {
  const access = await getCurrentMemberAccess();
  if (!access) {
    redirect("/login");
  }
  if (access.status !== "active") {
    redirect("/pending");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, status")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Impossible de charger les membres.");
  }

  const profiles = (data ?? []) as Profile[];
  return (
    <main className="page-content">
      <p className="eyebrow">Équipe</p>
      <h1>Membres</h1>
      <ul className="member-list" aria-label="Liste des membres">
        {profiles.map((profile) => (
          <li className="member-row" key={profile.id}>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- Discord serves provider-owned avatar URLs.
              <img alt="" className="member-avatar" src={profile.avatar_url} />
            ) : <span className="member-avatar member-initial" aria-hidden="true">{profile.username[0]?.toUpperCase()}</span>}
            <div>
              <strong>{profile.display_name || profile.username}</strong>
              <span>@{profile.username}</span>
            </div>
            <span className={`member-status member-status-${profile.status}`}>{profile.status === "active" ? "Actif" : "En attente"}</span>
            {profile.status === "pending" ? <ActivateMemberForm profileId={profile.id} /> : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
