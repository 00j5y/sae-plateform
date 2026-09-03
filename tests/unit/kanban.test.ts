import { describe, expect, it } from "vitest";

import { filterKanbanTasks, validateTaskImage } from "@/lib/kanban/utils";

const tasks = [
  {
    id: "task-1",
    projectId: "project-a",
    columnId: "todo",
    title: "Écrire les tests",
    color: "#6D4AFF",
    dueAt: "2026-09-10T10:00:00.000Z",
    assigneeIds: ["member-a"]
  },
  {
    id: "task-2",
    projectId: "project-b",
    columnId: "done",
    title: "Déployer",
    color: "#00AA55",
    dueAt: null,
    assigneeIds: ["member-b"]
  }
];

describe("filterKanbanTasks", () => {
  it("combine les filtres SAE, membre, colonne, échéance, couleur et recherche", () => {
    expect(filterKanbanTasks(tasks, {
      projectId: "project-a",
      memberId: "member-a",
      columnId: "todo",
      due: "upcoming",
      color: "#6D4AFF",
      query: "tests"
    })).toEqual([tasks[0]]);
  });

  it("exclut les tâches sans échéance quand une échéance est demandée", () => {
    expect(filterKanbanTasks(tasks, {
      projectId: "all",
      memberId: "all",
      columnId: "all",
      due: "upcoming",
      color: "all",
      query: ""
    })).toEqual([tasks[0]]);
  });
});

describe("validateTaskImage", () => {
  it("accepte une image WebP de 5 MiB ou moins", () => {
    expect(validateTaskImage({ type: "image/webp", size: 5 * 1024 * 1024 })).toEqual({ ok: true });
  });

  it("refuse les fichiers non-images et trop volumineux", () => {
    expect(validateTaskImage({ type: "application/pdf", size: 100 })).toEqual({
      ok: false,
      message: "Choisissez une image PNG, JPEG ou WebP."
    });
    expect(validateTaskImage({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toEqual({
      ok: false,
      message: "L’image ne doit pas dépasser 5 MiB."
    });
  });
});
