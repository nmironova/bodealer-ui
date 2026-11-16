// Synthetic fixtures only. Never use these credentials in a deployment.
export const testEnvironment = {
  BETA_PASSWORD: "test-only-shared-beta-password",
  SESSION_SECRET: "test-only-session-secret-never-use-in-production-2026",
  SESSION_TTL_SECONDS: "604800",
  BODEALER_API_URL: "http://127.0.0.1:3211",
  BACKEND_API_TOKEN: "fake-backend-token-for-integration-tests",
  BODEALER_TEST_MODE: "1",
};
export const testBaseURL = "http://localhost:3210";
