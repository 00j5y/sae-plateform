import { describe, expect, it } from "vitest";

import { canBootstrap, destinationForStatus } from "@/lib/auth/access";

describe("destinationForStatus", () => {
  it("sends a pending member to the pending screen", () => {
    expect(destinationForStatus("pending")).toBe("/pending");
  });

  it("sends an active member to the application home", () => {
    expect(destinationForStatus("active")).toBe("/");
  });
});

describe("canBootstrap", () => {
  it("only accepts the exact configured Discord identifier", () => {
    expect(canBootstrap("123", "123")).toBe(true);
    expect(canBootstrap("123", " 123")).toBe(false);
    expect(canBootstrap("123", "124")).toBe(false);
    expect(canBootstrap(undefined, "123")).toBe(false);
  });
});
