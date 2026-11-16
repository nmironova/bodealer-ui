import { NextResponse } from "next/server";
import { taskAccess } from "../../lib/auth/task-access";
import { backendFetch, responseJson } from "../../lib/backend";
import { readTaskList } from "../../lib/task-list";

export async function POST(request: Request) {
  const denied = await taskAccess(request, true);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 },
    );
  }
  try {
    const response = await backendFetch("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await responseJson(response);
    if (!response.ok)
      return NextResponse.json(
        { error: "Bodealer service rejected the request." },
        { status: response.status },
      );
    if (data === null)
      return NextResponse.json(
        { error: "Invalid task response." },
        { status: 502 },
      );
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach Bodealer service." },
      { status: 502 },
    );
  }
}

export async function GET(request: Request) {
  const denied = await taskAccess(request);
  if (denied) return denied;
  try {
    const response = await backendFetch("/tasks");
    if (!response.ok)
      return NextResponse.json(
        { error: "The task list is unavailable. Please try again." },
        { status: response.status, headers: { "Cache-Control": "no-store" } },
      );
    const tasks = readTaskList(await responseJson(response));
    if (!tasks)
      return NextResponse.json(
        { error: "The service returned an unsupported task list." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    return NextResponse.json(tasks, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load analyses. Please try again." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
