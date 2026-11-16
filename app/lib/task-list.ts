import { TASK_STATUS, type TaskStatus } from "./task-status";

export type ListedTaskStatus = TaskStatus | "queued";
export type ListedTask = {
  id: string;
  status: ListedTaskStatus;
  createdAt: string | null;
};
const statuses = new Set<string>([...Object.values(TASK_STATUS), "queued"]);

// GET /tasks returns persisted state records. Whitelist only fields used by
// the dashboard; never forward process paths, errors, PIDs, or configuration.
export function readTaskList(data: unknown): ListedTask[] | null {
  if (!Array.isArray(data)) return null;
  const tasks: ListedTask[] = [];
  const ids = new Set<string>();
  for (const item of data) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.id !== "string" ||
      !item.id.trim() ||
      !statuses.has(item.status) ||
      ids.has(item.id)
    )
      return null;
    ids.add(item.id);
    tasks.push({
      id: item.id,
      status: item.status as ListedTaskStatus,
      createdAt:
        typeof item.createdAt === "string" &&
        Number.isFinite(Date.parse(item.createdAt))
          ? item.createdAt
          : null,
    });
  }
  return tasks;
}

export function taskSummary(tasks: ListedTask[]) {
  return {
    running: tasks.filter((task) => task.status === TASK_STATUS.RUNNING).length,
    queued: tasks.filter((task) => task.status === "queued").length,
    completed: tasks.filter((task) => task.status === TASK_STATUS.COMPLETED)
      .length,
  };
}

export function recentTasks(tasks: ListedTask[]) {
  return [...tasks]
    .sort(
      (a, b) =>
        (b.createdAt ? Date.parse(b.createdAt) : 0) -
        (a.createdAt ? Date.parse(a.createdAt) : 0),
    )
    .slice(0, 5);
}
