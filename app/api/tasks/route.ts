import { NextResponse } from "next/server";
import { taskAccess } from "../../lib/auth/task-access";
import { backendFetch, responseJson } from "../../lib/backend";

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
