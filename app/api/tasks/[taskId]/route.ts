import { NextResponse } from "next/server";
import { TASK_STATUS } from "../../../lib/task-status";
import { normalizeTaskStatus } from "../../../lib/normalize-task-status";
import { taskAccess } from "../../../lib/auth/task-access";
import { backendFetch, responseJson } from "../../../lib/backend";

type Context = { params: Promise<{ taskId: string }> };

export async function DELETE(request: Request, { params }: Context) {
  const denied = await taskAccess(request);
  if (denied) return denied;
  const { taskId } = await params;
  if (!taskId)
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  try {
    const response = await backendFetch(
      `/tasks/${encodeURIComponent(taskId)}`,
      { method: "DELETE" },
    );
    if (!response.ok)
      return NextResponse.json(
        { error: "Failed to cancel task." },
        { status: response.status },
      );
    return NextResponse.json({ status: TASK_STATUS.CANCELLED });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach Bodealer service." },
      { status: 502 },
    );
  }
}

export async function GET(request: Request, { params }: Context) {
  const denied = await taskAccess(request);
  if (denied) return denied;
  const { taskId } = await params;
  if (!taskId)
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  try {
    const response = await backendFetch(`/tasks/${encodeURIComponent(taskId)}`);
    if (!response.ok)
      return NextResponse.json(
        { error: "Failed to fetch task status." },
        { status: response.status },
      );
    const taskStatus = normalizeTaskStatus(await responseJson(response));
    if (!taskStatus)
      return NextResponse.json(
        { error: "Invalid task status response" },
        { status: 502 },
      );
    if (taskStatus.status === TASK_STATUS.FAILED) {
      // Solver/service exceptions can include private infrastructure details.
      taskStatus.error =
        "Calculation failed. Review available output or contact the beta administrator.";
    }
    return NextResponse.json(taskStatus);
  } catch {
    return NextResponse.json(
      { error: "Unable to reach Bodealer service." },
      { status: 502 },
    );
  }
}
