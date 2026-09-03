import { NextResponse } from "next/server";

import { canBootstrap, destinationForStatus, type MemberStatus } from "@/lib/auth/access";
import { normalizeDiscordProfile } from "@/lib/auth/discord-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function loginRedirect(request: Request, reason: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return loginRedirect(request, "oauth");
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return loginRedirect(request, "oauth");
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const discordProfile = user ? normalizeDiscordProfile(user) : null;

  if (userError || !user || !discordProfile) {
    return loginRedirect(request, "discord-profile");
  }

  const admin = createAdminClient();
  const { data: existingProfile, error: existingProfileError } = await admin
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    return loginRedirect(request, "profile");
  }

  const isBootstrapMember = !existingProfile && canBootstrap(
    discordProfile.discordId,
    process.env.INITIAL_ACTIVE_DISCORD_ID
  );
  const status: MemberStatus = existingProfile?.status === "active" || isBootstrapMember ? "active" : "pending";
  const profile = {
    id: user.id,
    discord_id: discordProfile.discordId,
    username: discordProfile.username,
    display_name: discordProfile.displayName,
    avatar_url: discordProfile.avatarUrl,
    ...(isBootstrapMember ? { status: "active" as const, activated_at: new Date().toISOString() } : {})
  };
  const { error: upsertError } = await admin.from("profiles").upsert(profile, { onConflict: "id" });

  if (upsertError) {
    return loginRedirect(request, "profile");
  }

  return NextResponse.redirect(new URL(destinationForStatus(status), request.url));
}
