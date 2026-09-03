import { describe, expect, it } from "vitest";

import { taskSchema } from "@/lib/validations/task";

const validTask = {
  projectId: "3b189510-dc96-4ea7-8521-b48003063b90",
  columnId: "c5a30d2b-34e6-494e-9c4b-4987df0c5b1b",
  title: "Préparer la démo",
  color: "#6D4AFF",
  dueAt: null
};

describe("taskSchema", () => {
  it("rejects an empty title", () => {
    expect(taskSchema.safeParse({ ...validTask, title: "   " }).success).toBe(false);
  });

  it("rejects a missing project", () => {
    expect(taskSchema.safeParse({
      columnId: validTask.columnId,
      title: validTask.title,
      color: validTask.color,
      dueAt: validTask.dueAt
    }).success).toBe(false);
  });

  it("rejects a title longer than 160 characters", () => {
    expect(taskSchema.safeParse({ ...validTask, title: "a".repeat(161) }).success).toBe(false);
  });

  it("uses safe defaults for optional task fields", () => {
    const parsed = taskSchema.parse(validTask);

    expect(parsed.description).toBe("");
    expect(parsed.assigneeIds).toEqual([]);
  });

  it("rejects an invalid deadline or color", () => {
    expect(taskSchema.safeParse({ ...validTask, dueAt: "tomorrow" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...validTask, color: "violet" }).success).toBe(false);
  });
});
