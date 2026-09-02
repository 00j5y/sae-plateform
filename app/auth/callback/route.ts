import { NextResponse } from "next/server";
import type { User, UserIdentity } from "@supabase/supabase-js";

import { canBootstrap, destinationForStatus, type MemberStatus } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type DiscordProfile = {
  avatarUrl: string | null;
  discordId: string;
  displayName: string | null;
  username: string;
};

function textField(data: Record<string, unknown>, field: string) {
  const value = data[field];
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDiscordProfile(user: User): DiscordProfile | null {
  const identity = user.identities?.find((item): item is UserIdentity => item.provider === "discord");
  const data = identity?.identity_data as Record<string, unknown> | undefined;

  if (!data) {
    return null;
  }

  const discordId = textField(data, "provider_id") || textField(data, "sub");
  const username = textField(data, "user_name") || textField(data, "preferred_username");
  const displayName = textField(data, "global_name") || textField(data, "full_name") || null;
  const avatarUrl = normaliseDiscordAvatarUrl(textField(data, "avatar_url"));

  if (!/^\d{5,32}$/.test(discordId) || !/^[a-z0-9._]{2,32}$/.test(username)) {
    return null;
  }

  return {
    avatarUrl,
    discordId,
    displayName: displayName?.slice(0, 100) ?? null,
    username
  };
}

function normaliseDiscordAvatarUrl(value: string) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["cdn.discordapp.com", "media.discordapp.net"].includes(url.hostname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

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
