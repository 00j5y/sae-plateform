export type CalendarEventType = "dev" | "testing" | "bugfix" | "meeting" | "deadline";
export type CalendarItemKind = "event" | "task";

export type CalendarItem = {
  id: string;
  title: string;
  start: string;
  end?: string;
  projectId: string;
  kind: CalendarItemKind;
  editable: boolean;
  color: string;
  completed: boolean;
  memberIds: string[];
  eventType?: CalendarEventType;
};

export type CalendarFilters = {
  projectId?: string;
  memberId?: string;
  type?: CalendarEventType;
  query?: string;
  hideDone?: boolean;
};
