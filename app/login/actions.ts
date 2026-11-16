"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  authConfig,
  cookieName,
  cookieOptions,
  correctPassword,
  createSession,
} from "../lib/auth/session";
import { clientKey, localRateLimiter } from "../lib/auth/rate-limit";
import { sameOrigin } from "../lib/auth/request";

export type LoginState = { error?: string };
export async function signIn(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const requestHeaders = await headers();
  if (!sameOrigin(requestHeaders))
    return { error: "Please sign in from this website." };
  const limit = localRateLimiter.check(
    `login:${clientKey(requestHeaders)}`,
    5,
    15 * 60 * 1000,
  );
  if (!limit.allowed)
    return {
      error: `Too many attempts. Try again in ${limit.retryAfter} seconds.`,
    };
  let config;
  try {
    config = authConfig();
  } catch {
    return {
      error: "Sign in is not configured. Contact the beta administrator.",
    };
  }
  const password = formData.get("password");
  if (
    typeof password !== "string" ||
    password.length > 1024 ||
    !correctPassword(password, config)
  )
    return { error: "Incorrect password. Please try again." };
  (await cookies()).set(
    cookieName(config),
    createSession(config),
    cookieOptions(config),
  );
  redirect("/boards/new");
}
