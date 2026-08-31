export const TASK_STATUS = {
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

type TaskOutput = {
  resultText?: string;
  logTail?: string;
};

export type TaskStatusResponse =
  | ({ status: typeof TASK_STATUS.RUNNING } & TaskOutput)
  | ({ status: typeof TASK_STATUS.COMPLETED } & TaskOutput)
  | { status: typeof TASK_STATUS.FAILED; error: string }
  | { status: typeof TASK_STATUS.CANCELLED };
