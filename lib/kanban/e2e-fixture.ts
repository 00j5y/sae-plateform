import type { KanbanData } from "@/lib/kanban/data";
import type { KanbanTask } from "@/lib/kanban/types";

const project = {
  id: "3b189510-dc96-4ea7-8521-b48003063b90",
  name: "SAE 3.01",
  description: "Données locales réservées au scénario E2E.",
  color: "#6D4AFF",
  startsOn: null,
  endsOn: null
};
const columns = [
  { id: "c5a30d2b-34e6-494e-9c4b-4987df0c5b1b", name: "À faire", position: 1000 },
  { id: "e5708730-31b9-4fe9-a8f3-2f7e7464f65c", name: "Terminé", position: 2000 }
];
const members = [{ id: "00000000-0000-4000-8000-000000000001", username: "e2e", name: "Membre E2E" }];
let tasks: KanbanTask[] = [];

export function isE2eFixtureMode(environment: Record<string, string | undefined> = process.env) {
  return environment.E2E_TEST_MODE === "true" && environment.NODE_ENV !== "production";
}

export function getE2eKanbanData(projectId?: string): KanbanData {
  return {
    projects: projectId && projectId !== project.id ? [] : [project],
    columns,
    members,
    tasks: projectId ? tasks.filter((task) => task.projectId === projectId) : tasks
  };
}

export function createE2eFixtureTask(input: Pick<KanbanTask, "projectId" | "columnId" | "title" | "description" | "color" | "dueAt"> & { assigneeIds: string[] }) {
  const task: KanbanTask = {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    columnId: input.columnId,
    title: input.title,
    description: input.description,
    color: input.color,
    dueAt: input.dueAt,
    position: tasks.filter((item) => item.projectId === input.projectId && item.columnId === input.columnId).length * 1000 + 1000,
    assignees: members.filter((member) => input.assigneeIds.includes(member.id)),
    comments: [],
    attachments: []
  };
  tasks = [...tasks, task];
  return task;
}

export function resetE2eFixture() {
  tasks = [];
}
