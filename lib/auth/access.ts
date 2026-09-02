export type MemberStatus = "pending" | "active";

export type MemberAccess = {
  userId: string;
  status: MemberStatus;
};

export function destinationForStatus(status: MemberStatus) {
  return status === "active" ? "/" : "/pending";
}

export function canBootstrap(discordId: string | undefined, initialActiveDiscordId: string | undefined) {
  return Boolean(discordId && initialActiveDiscordId && discordId === initialActiveDiscordId);
}

export async function getCurrentMemberAccess(): Promise<MemberAccess | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  if (process.env.E2E_TEST_MODE === "true" && process.env.NODE_ENV !== "production") {
    const fixtureStatus = cookieStore.get("sae-e2e-member-status")?.value;
    if (fixtureStatus === "pending" || fixtureStatus === "active") {
      return { userId: "00000000-0000-4000-8000-000000000001", status: fixtureStatus };
    }
    return null;
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Impossible de vérifier les droits du membre.");
  }

  return { userId: user.id, status: profile?.status === "active" ? "active" : "pending" };
}
