export type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  startsOn: string | null;
  endsOn: string | null;
};

export type KanbanColumn = { id: string; name: string; position: number };

export type KanbanMember = { id: string; name: string; username: string };

export type TaskComment = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type TaskAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: string;
};

export type KanbanTask = {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string;
  color: string;
  dueAt: string | null;
  position: number;
  assignees: KanbanMember[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
};
