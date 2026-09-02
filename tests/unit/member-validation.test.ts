import { describe, expect, it } from "vitest";

import { activateMemberSchema } from "@/lib/validations/member";

describe("activateMemberSchema", () => {
  it("accepts a UUID profile id", () => {
    expect(
      activateMemberSchema.safeParse({ profileId: "c5a30d2b-34e6-494e-9c4b-4987df0c5b1b" }).success
    ).toBe(true);
  });

  it("rejects a Discord username as a profile id", () => {
    expect(activateMemberSchema.safeParse({ profileId: "discord-name" }).success).toBe(false);
  });
});
