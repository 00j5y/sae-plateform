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

const uuidV4Pattern = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const uuidPattern = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const taskAttachmentPathPattern = new RegExp(`^(${uuidPattern})/(${uuidPattern})/(${uuidV4Pattern})$`, "i");

export function isTaskAttachmentPath(path: string, projectId: string, taskId: string) {
  const matches = taskAttachmentPathPattern.exec(path);
  return Boolean(matches && matches[1].toLowerCase() === projectId.toLowerCase() && matches[2].toLowerCase() === taskId.toLowerCase());
}
