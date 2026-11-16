import { test as base, expect } from "@playwright/test";
import {
  authConfig,
  cookieName,
  createSession,
} from "../../app/lib/auth/session";
import { testBaseURL, testEnvironment } from "./test-env.mjs";

export const test = base.extend<{ signedIn: void }>({
  signedIn: [
    async ({ context }, use) => {
      const config = authConfig(testEnvironment);
      await context.addCookies([
        {
          name: cookieName(config),
          value: createSession(config),
          url: testBaseURL,
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
      await use();
    },
    { auto: true },
  ],
});
export { expect };
