import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const r = await fetch(`${process.env.BODEALER_URL}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.BODEALER_API_KEY ?? "",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}
