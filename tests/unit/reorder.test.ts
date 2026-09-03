import { describe, expect, it } from "vitest";

import { nextPosition } from "@/lib/tasks/reorder";

describe("nextPosition", () => {
  it("returns the midpoint between two tasks", () => {
    expect(nextPosition(1000, 2000)).toBe(1500);
  });

  it("places a task before the first position", () => {
    expect(nextPosition(null, 1000)).toBe(0);
  });

  it("places a task after the last position", () => {
    expect(nextPosition(2000, null)).toBe(3000);
  });

  it("uses the initial interval when no positions exist", () => {
    expect(nextPosition(null, null)).toBe(0);
  });
});
