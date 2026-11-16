import { NextResponse } from "next/server";
import { authConfig, cookieName, cookieOptions } from "../lib/auth/session";
import { sameOrigin } from "../lib/auth/request";

export async function POST(request: Request) {
  if (!sameOrigin(request.headers, request.url))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  const config = authConfig();
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/login" },
  });
  response.cookies.set(cookieName(config), "", {
    ...cookieOptions(config),
    maxAge: 0,
    expires: new Date(0),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
