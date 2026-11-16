import { NextResponse, type NextRequest } from "next/server";
import { authConfig, cookieName, verifySession } from "./app/lib/auth/session";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Login verifies credentials server-side. Logout must clear even invalid sessions.
  if (path === "/login" || path === "/logout") return NextResponse.next();
  // Let Server Actions perform their own auth check so Next.js can return its
  // action redirect protocol instead of trying to parse an HTML login response.
  if (request.method === "POST" && request.headers.has("next-action"))
    return NextResponse.next();
  try {
    const config = authConfig();
    if (verifySession(request.cookies.get(cookieName(config))?.value, config)) {
      const response = NextResponse.next();
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  } catch {
    return NextResponse.json(
      {
        error:
          "Authentication is not configured. Contact the beta administrator.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (path.startsWith("/api/"))
    return NextResponse.json(
      { error: "Sign in to continue." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|spades.png|hearts.png|diamonds.png|clubs.png).*)",
  ],
};
