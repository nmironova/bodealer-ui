import "server-only";
import { currentSession } from "./auth/request";

export function backendConfig(
  env: Record<string, string | undefined> = process.env,
) {
  if (!env.BODEALER_API_URL) throw new Error("BODEALER_API_URL is required.");
  if (!env.BACKEND_API_TOKEN || /[\r\n]/.test(env.BACKEND_API_TOKEN))
    throw new Error(
      "BACKEND_API_TOKEN is required and must be a valid header value.",
    );
  let url: URL;
  try {
    url = new URL(env.BODEALER_API_URL);
  } catch {
    throw new Error("BODEALER_API_URL must be an absolute HTTPS URL.");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        env.NODE_ENV !== "production" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ))
  )
    throw new Error(
      "BODEALER_API_URL must use HTTPS (HTTP loopback is allowed for local development) without credentials, query, or fragment.",
    );
  return {
    url: url.toString().replace(/\/$/, ""),
    token: env.BACKEND_API_TOKEN,
  };
}

export async function backendFetch(path: string, init: RequestInit = {}) {
  if (!(await currentSession())) throw new Error("Authentication required.");
  const config = backendConfig();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${config.token}`);
  // A backend redirect must never carry our credential to another host.
  return fetch(`${config.url}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
}

export async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
