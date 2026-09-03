import { describe, expect, it } from "vitest";

import { normalizeDiscordProfile } from "@/lib/auth/discord-profile";

describe("normalizeDiscordProfile", () => {
  it("uses authenticated Discord metadata when Supabase omits identities", () => {
    const profile = normalizeDiscordProfile({
      app_metadata: { provider: "discord", providers: ["discord"] },
      identities: [],
      user_metadata: {
        avatar_url: "https://cdn.discordapp.com/avatars/123/avatar.png",
        full_name: "Jay L'héronde",
        name: "Jay L'héronde",
        provider_id: "12345678901234567"
      }
    });

    expect(profile).toEqual({
      avatarUrl: "https://cdn.discordapp.com/avatars/123/avatar.png",
      discordId: "12345678901234567",
      displayName: "Jay L'héronde",
      username: "Jay L'héronde"
    });
  });
});
