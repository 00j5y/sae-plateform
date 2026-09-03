import { afterEach, describe, expect, it } from "vitest";

import { createE2eFixtureTask, getE2eKanbanData, isE2eFixtureMode, resetE2eFixture } from "@/lib/kanban/e2e-fixture";

afterEach(() => resetE2eFixture());

describe("fixture Kanban E2E", () => {
  it("is only enabled explicitly outside production", () => {
    expect(isE2eFixtureMode({ E2E_TEST_MODE: "true", NODE_ENV: "test" })).toBe(true);
    expect(isE2eFixtureMode({ E2E_TEST_MODE: "true", NODE_ENV: "production" })).toBe(false);
    expect(isE2eFixtureMode({ NODE_ENV: "test" })).toBe(false);
  });

  it("keeps a task created through the E2E fixture available to the next server render", () => {
    const fixture = getE2eKanbanData();
    const task = createE2eFixtureTask({
      projectId: fixture.projects[0].id,
      columnId: fixture.columns[0].id,
      title: "Écrire les tests",
      description: "",
      color: "#6D4AFF",
      dueAt: null,
      assigneeIds: []
    });

    expect(getE2eKanbanData().tasks).toContainEqual(expect.objectContaining({ id: task.id, title: "Écrire les tests" }));
  });
});
