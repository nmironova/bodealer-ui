import { NextResponse } from "next/server";

import { TASK_STATUS, type TaskStatusResponse } from "@/app/lib/task-status";

function readStringProperty(value: unknown, property: string) {
  if (typeof value !== "object" || value === null || !(property in value)) {
    return undefined;
  }

  const propertyValue = (value as Record<string, unknown>)[property];
  return typeof propertyValue === "string" ? propertyValue : undefined;
}

function normalizeTaskStatus(data: unknown): TaskStatusResponse | null {
  const status = readStringProperty(data, "status")?.toLowerCase();

  if (!status) {
    return null;
  }

  if (status === TASK_STATUS.COMPLETED) {
    return {
      status,
      resultText: readStringProperty(data, "resultText"),
    };
  }

  if (status === TASK_STATUS.FAILED) {
    return {
      status,
      error: readStringProperty(data, "error") ?? "Task failed",
    };
  }

  if (status === TASK_STATUS.CANCELLED || status === "canceled") {
    return { status: TASK_STATUS.CANCELLED };
  }

  return { status: TASK_STATUS.RUNNING };
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;

  if (!taskId) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  try {
    const r = await fetch(`${process.env.BODEALER_URL}/tasks/${taskId}`, {
      method: "DELETE",
      headers: {
        "X-API-Key": process.env.BODEALER_API_KEY ?? "",
      },
      cache: "no-store",
    });

    const data: unknown = r.status === 204 ? null : await r.json();

    if (!r.ok) {
      return NextResponse.json(
        {
          error: readStringProperty(data, "error") ?? "Failed to cancel task",
        },
        { status: r.status },
      );
    }

    return NextResponse.json({ status: TASK_STATUS.CANCELLED });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to cancel task" },
      { status: 500 },
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;

  if (!taskId) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  try {
    const r = await fetch(`${process.env.BODEALER_URL}/tasks/${taskId}`, {
      method: "GET",
      headers: {
        "X-API-Key": process.env.BODEALER_API_KEY ?? "",
      },
      cache: "no-store",
    });

    const data: unknown = await r.json();

    if (!r.ok) {
      return NextResponse.json(
        {
          error:
            readStringProperty(data, "error") ?? "Failed to fetch task status",
        },
        { status: r.status },
      );
    }

    const taskStatus = normalizeTaskStatus(data);
    if (!taskStatus) {
      return NextResponse.json(
        { error: "Invalid task status response" },
        { status: 502 },
      );
    }

    return NextResponse.json(taskStatus);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch task status" },
      { status: 500 },
    );
  }
}
