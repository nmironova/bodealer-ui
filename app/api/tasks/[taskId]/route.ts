import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;

  if (!taskId) {
    return NextResponse.json(
      { error: "Task ID is required" },
      { status: 400 },
    );
  }

  try {
    const r = await fetch(`${process.env.BODEALER_URL}/tasks/${taskId}`, {
      method: "GET",
      headers: {
        "X-API-Key": process.env.BODEALER_API_KEY ?? "",
      },
      cache: "no-store",
    });

    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch task status" },
      { status: 500 },
    );
  }
}
