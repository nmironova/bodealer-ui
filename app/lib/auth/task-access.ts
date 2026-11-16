import "server-only";
import { NextResponse } from "next/server";
import { currentSession, sameOrigin } from "./request";
import { clientKey, localRateLimiter } from "./rate-limit";
import type { Session } from "./session";

export function submissionLimit(headers: Headers, session: Session) {
  const sessionLimit = localRateLimiter.check(
    `submit:session:${session.id}`,
    10,
    60000,
  );
  const ipLimit = localRateLimiter.check(
    `submit:ip:${clientKey(headers)}`,
    10,
    60000,
  );
  return {
    allowed: sessionLimit.allowed && ipLimit.allowed,
    retryAfter: Math.max(sessionLimit.retryAfter, ipLimit.retryAfter),
  };
}

export async function taskAccess(request: Request, submit = false) {
  let session;
  try {
    session = await currentSession();
  } catch {
    return NextResponse.json(
      { error: "Authentication is not configured." },
      { status: 503 },
    );
  }
  if (!session)
    return NextResponse.json(
      { error: "Sign in to continue." },
      { status: 401 },
    );
  if (request.method !== "GET" && !sameOrigin(request.headers, request.url))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  if (submit) {
    const limit = submissionLimit(request.headers, session);
    if (!limit.allowed)
      return NextResponse.json(
        {
          error: "Too many task submissions. Please wait before trying again.",
        },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
  }
  return null;
}
