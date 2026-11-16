import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfig, cookieName, verifySession } from "./session";

export async function currentSession() {
  const config = authConfig();
  return verifySession(
    (await cookies()).get(cookieName(config))?.value,
    config,
  );
}

export async function requireSession() {
  const session = await currentSession();
  if (!session) redirect("/login");
  return session;
}

export function sameOrigin(headers: Headers, fallbackOrigin?: string) {
  const origin = headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    const url = new URL(origin);
    // Prefer the platform's host, never a user-supplied redirect destination.
    const host =
      headers.get("host") ??
      (fallbackOrigin ? new URL(fallbackOrigin).host : undefined);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.host === host
    );
  } catch {
    return false;
  }
}
