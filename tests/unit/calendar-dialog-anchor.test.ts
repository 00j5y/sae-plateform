import { describe, expect, it } from "vitest";

import { getDialogAnchor } from "@/lib/calendar/dialog-anchor";

describe("calendar event dialog anchoring", () => {
  it("places the dialog below its event and keeps it within the viewport", () => {
    expect(getDialogAnchor({ top: 700, right: 980, bottom: 730, left: 900, width: 80, height: 30 }, { width: 1024, height: 768 }, { width: 400, height: 300 })).toEqual({ top: 388, left: 608 });
  });

  it("returns no anchor when the dialog was not opened from an event source", () => {
    expect(getDialogAnchor(undefined, { width: 1024, height: 768 }, { width: 400, height: 300 })).toBeUndefined();
  });
});
