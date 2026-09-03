type DiscordAuthUser = {
  app_metadata?: unknown;
  identities?: Array<{ identity_data?: unknown; provider?: unknown }> | null;
  user_metadata?: unknown;
};

export type DiscordProfile = {
  avatarUrl: string | null;
  discordId: string;
  displayName: string | null;
  username: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function textField(data: Record<string, unknown>, field: string) {
  const value = data[field];
  return typeof value === "string" ? value.trim() : "";
}

function firstTextField(data: Record<string, unknown>, fields: string[]) {
  return fields.map((field) => textField(data, field)).find(Boolean) ?? "";
}

function isDiscordProvider(user: DiscordAuthUser) {
  const appMetadata = record(user.app_metadata);
  if (!appMetadata) {
    return false;
  }

  return appMetadata.provider === "discord" || (
    Array.isArray(appMetadata.providers) && appMetadata.providers.includes("discord")
  );
}

function discordIdentityData(user: DiscordAuthUser) {
  const identity = user.identities?.find((item) => item.provider === "discord");
  const identityData = record(identity?.identity_data);
  if (identityData) {
    return identityData;
  }

  return isDiscordProvider(user) ? record(user.user_metadata) : null;
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

export function normalizeDiscordProfile(user: DiscordAuthUser): DiscordProfile | null {
  const data = discordIdentityData(user);
  if (!data) {
    return null;
  }

  const discordId = firstTextField(data, ["provider_id", "sub"]);
  if (!/^\d{5,32}$/.test(discordId)) {
    return null;
  }

  const username = firstTextField(data, ["user_name", "preferred_username", "username", "name", "full_name"])
    || `discord-${discordId}`;
  const displayName = firstTextField(data, ["global_name", "full_name", "name"]) || null;

  return {
    avatarUrl: normaliseDiscordAvatarUrl(textField(data, "avatar_url")),
    discordId,
    displayName: displayName?.slice(0, 100) ?? null,
    username: username.slice(0, 100)
  };
}
