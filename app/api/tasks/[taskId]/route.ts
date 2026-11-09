import { NextResponse } from "next/server";

import { TASK_STATUS } from "@/app/lib/task-status";
import {
  normalizeTaskStatus,
  readStringProperty,
} from "@/app/lib/normalize-task-status";

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
