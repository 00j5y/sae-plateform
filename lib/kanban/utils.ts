type FilterableTask = {
  projectId: string;
  columnId: string;
  title: string;
  color: string;
  dueAt: string | null;
  assigneeIds: string[];
};

export type KanbanFilterValues = {
  projectId: string;
  memberId: string;
  columnId: string;
  due: "all" | "upcoming" | "none";
  color: string;
  query: string;
};

export function filterKanbanTasks<T extends FilterableTask>(tasks: T[], filters: KanbanFilterValues) {
  const query = filters.query.trim().toLocaleLowerCase("fr");

  return tasks.filter((task) => {
    if (filters.projectId !== "all" && task.projectId !== filters.projectId) return false;
    if (filters.memberId !== "all" && !task.assigneeIds.includes(filters.memberId)) return false;
    if (filters.columnId !== "all" && task.columnId !== filters.columnId) return false;
    if (filters.color !== "all" && task.color.toLowerCase() !== filters.color.toLowerCase()) return false;
    if (filters.due === "upcoming" && !task.dueAt) return false;
    if (filters.due === "none" && task.dueAt) return false;
    return !query || task.title.toLocaleLowerCase("fr").includes(query);
  });
}

const acceptedTaskImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxTaskImageSize = 5 * 1024 * 1024;

export function validateTaskImage(file: Pick<File, "type" | "size">) {
  if (!acceptedTaskImageTypes.has(file.type)) {
    return { ok: false as const, message: "Choisissez une image PNG, JPEG ou WebP." };
  }
  if (file.size > maxTaskImageSize) {
    return { ok: false as const, message: "L’image ne doit pas dépasser 5 MiB." };
  }
  return { ok: true as const };
}

export const taskImageConstraints = {
  acceptedTypes: [...acceptedTaskImageTypes],
  maxSize: maxTaskImageSize
};
