import { describe, expect, it } from "vitest";

import { focusTrapIndex } from "@/lib/kanban/dialog-focus";

describe("focusTrapIndex", () => {
  it("returns to the first control when Tab leaves the last one", () => {
    expect(focusTrapIndex(4, 3, false)).toBe(0);
  });

  it("returns to the last control when Shift+Tab leaves the first one", () => {
    expect(focusTrapIndex(4, 0, true)).toBe(3);
  });

  it("keeps regular tab movement inside the dialog", () => {
    expect(focusTrapIndex(4, 1, false)).toBeNull();
  });
});
