export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production"
  ) {
    const { authConfig } = await import("./app/lib/auth/session");
    const { backendConfig } = await import("./app/lib/backend");
    authConfig();
    backendConfig();
  }
}
