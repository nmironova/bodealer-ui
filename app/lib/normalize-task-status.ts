import { TASK_STATUS, type TaskStatusResponse } from "./task-status";

export function readStringProperty(value: unknown, property: string) {
  if (typeof value !== "object" || value === null || !(property in value)) {
    return undefined;
  }

  const propertyValue = (value as Record<string, unknown>)[property];
  return typeof propertyValue === "string" ? propertyValue : undefined;
}

function readTaskResult(data: unknown): string | undefined {
  return (
    readStringProperty(data, "resultText") ?? readStringProperty(data, "result")
  );
}

export function normalizeTaskStatus(data: unknown): TaskStatusResponse | null {
  const status = readStringProperty(data, "status")?.toLowerCase();

  if (!status) {
    return null;
  }

  const resultText = readTaskResult(data);
  const logTail = readStringProperty(data, "logTail");

  // The Bodealer service can incorrectly mark a successfully spawned task as
  // failed when its process handle is null. The calculation continues and the
  // same task record eventually receives a result, so keep polling until then.
  const isDetachedProcessError =
    status === TASK_STATUS.FAILED &&
    readStringProperty(data, "error") ===
      "Cannot read properties of null (reading 'on')";

  if (
    status === TASK_STATUS.COMPLETED ||
    (isDetachedProcessError && resultText)
  ) {
    return {
      status: TASK_STATUS.COMPLETED,
      resultText,
      logTail,
    };
  }

  if (isDetachedProcessError) {
    return { status: TASK_STATUS.RUNNING, resultText, logTail };
  }

  if (status === TASK_STATUS.FAILED) {
    return {
      status,
      error: readStringProperty(data, "error") ?? "Task failed",
      ...(resultText !== undefined ? { resultText } : {}),
      ...(logTail !== undefined ? { logTail } : {}),
    };
  }

  if (status === TASK_STATUS.CANCELLED || status === "canceled") {
    return {
      status: TASK_STATUS.CANCELLED,
      ...(resultText !== undefined ? { resultText } : {}),
      ...(logTail !== undefined ? { logTail } : {}),
    };
  }

  return {
    status: TASK_STATUS.RUNNING,
    resultText,
    logTail,
  };
}
