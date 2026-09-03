import { describe, expect, it } from "vitest";

import { filterKanbanTasks, isTaskAttachmentPath, validateTaskImage } from "@/lib/kanban/utils";

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

describe("isTaskAttachmentPath", () => {
  const projectId = "3b189510-dc96-4ea7-8521-b48003063b90";
  const taskId = "c5a30d2b-34e6-494e-9c4b-4987df0c5b1b";
  const uploadId = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts only the exact project/task/UUID v4 storage path", () => {
    expect(isTaskAttachmentPath(`${projectId}/${taskId}/${uploadId}`, projectId, taskId)).toBe(true);
  });

  it("rejects suffixes, extensions and a UUID that is not v4", () => {
    expect(isTaskAttachmentPath(`${projectId}/${taskId}/${uploadId}.png`, projectId, taskId)).toBe(false);
    expect(isTaskAttachmentPath(`${projectId}/${taskId}/550e8400-e29b-31d4-a716-446655440000`, projectId, taskId)).toBe(false);
    expect(isTaskAttachmentPath(`${projectId}/other/${uploadId}`, projectId, taskId)).toBe(false);
  });
});
