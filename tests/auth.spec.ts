import { expect, test, type BrowserContext } from "@playwright/test";
import { authConfig, cookieName, createSession } from "../app/lib/auth/session";
import { createBoardFile } from "../app/lib/board-config-file";
import { testBaseURL, testEnvironment } from "./fixtures/test-env.mjs";

async function authenticate(context: BrowserContext, value?: string) {
  const config = authConfig(testEnvironment);
  await context.addCookies([
    {
      name: cookieName(config),
      value: value ?? createSession(config),
      url: testBaseURL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function backendRequests() {
  return (await (
    await fetch(`${testEnvironment.BODEALER_API_URL}/__test__/requests`)
  ).json()) as Array<{
    method: string;
    url: string;
    authorization: string;
    contentType: string;
    body: string;
  }>;
}

const origin = { Origin: testBaseURL };

test("pages, API creation, polling and cancellation deny unauthenticated requests without contacting backend", async ({
  page,
}) => {
  const before = (await backendRequests()).length;
  for (const path of [
    "/",
    "/dashboard",
    "/boards/new",
    "/boards/running",
    "/boards/completed",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(`${testBaseURL}/login`);
  }
  for (const method of ["POST", "GET", "DELETE"]) {
    const response = await page.request.fetch(
      method === "POST" ? "/api/tasks" : "/api/tasks/task-test",
      { method, headers: origin, data: method === "POST" ? {} : undefined },
    );
    expect(response.status()).toBe(401);
  }
  expect((await backendRequests()).length).toBe(before);
});

test("incorrect password gives feedback; correct password issues an HttpOnly session and logout clears it", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.getByLabel("Beta password").fill("wrong password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.locator("#login-error")).toContainText(
    "Incorrect password",
  );
  await expect(page.getByLabel("Beta password")).toHaveValue("wrong password");
  await page.getByLabel("Beta password").fill(testEnvironment.BETA_PASSWORD);
  await page.getByLabel("Beta password").press("Enter");
  await expect(page).toHaveURL(`${testBaseURL}/boards/new`);
  const session = (await context.cookies()).find(
    (cookie) => cookie.name === "bodealer_beta",
  )!;
  expect(session.httpOnly).toBe(true);
  expect(session.sameSite).toBe("Lax");
  expect(session.expires).toBeGreaterThan(Date.now() / 1000 + 604700);
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    session.value,
  );
  expect(session.value).not.toContain(testEnvironment.BETA_PASSWORD);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(`${testBaseURL}/login`);
  expect(
    (await context.cookies()).some((cookie) => cookie.name === session.name),
  ).toBe(false);
  expect((await page.request.get("/api/tasks/task-test")).status()).toBe(401);
  // Logging out also works with no current session, and never by a cross-site GET.
  expect(
    (
      await page.request.post("/logout", { headers: origin, maxRedirects: 0 })
    ).status(),
  ).toBe(303);
  expect((await page.request.get("/logout")).status()).toBe(405);
});

test("expired and tampered cookies cannot access pages or APIs", async ({
  page,
  context,
}) => {
  const config = authConfig(testEnvironment);
  const valid = createSession(config);
  for (const value of [
    "invalid",
    createSession(config, 1000),
    valid.replace(/^./, valid[0] === "a" ? "b" : "a"),
  ]) {
    await context.clearCookies();
    await authenticate(context, value);
    expect((await page.request.get("/api/tasks/task-test")).status()).toBe(401);
    await page.goto("/boards/new");
    await expect(page).toHaveURL(`${testBaseURL}/login`);
  }
});

test("authenticated JSON submission, intermediate polling and cancellation preserve formats and Bearer authorization", async ({
  context,
  request,
}) => {
  await authenticate(context);
  // Use the context request client so it shares its signed cookie.
  const created = await context.request.post("/api/tasks", {
    headers: origin,
    data: { task: "example" },
  });
  expect(created.status()).toBe(202);
  const { id } = await created.json();
  const first = await context.request.get(`/api/tasks/${id}`);
  expect(await first.json()).toMatchObject({
    status: "running",
    logTail: "  NORTH   EAST\nPartial Walrus output\n",
  });
  const second = await context.request.get(`/api/tasks/${id}`);
  expect(await second.json()).toMatchObject({
    status: "completed",
    resultText: "  NORTH   EAST\nFinal Walrus output\n",
  });
  expect(
    await (
      await context.request.delete(`/api/tasks/${id}`, { headers: origin })
    ).json(),
  ).toEqual({ status: "cancelled" });
  expect(await (await context.request.get(`/api/tasks/${id}`)).json()).toEqual({
    status: "cancelled",
  });
  const captured = (await backendRequests()).filter(
    (entry) =>
      entry.url === `/tasks/${id}` ||
      (entry.url === "/tasks" && entry.body === '{"task":"example"}'),
  );
  expect(captured.length).toBeGreaterThanOrEqual(5);
  expect(
    captured.every(
      (entry) =>
        entry.authorization === `Bearer ${testEnvironment.BACKEND_API_TOKEN}`,
    ),
  ).toBe(true);
  const missing = await context.request.get("/api/tasks/not-found");
  expect(missing.status()).toBe(404);
  expect(await missing.text()).not.toContain(testEnvironment.BACKEND_API_TOKEN);
  expect(await missing.text()).not.toContain(testEnvironment.BODEALER_API_URL);
  const failed = await context.request.get("/api/tasks/failed-test");
  expect(await failed.json()).toEqual({
    status: "failed",
    error:
      "Calculation failed. Review available output or contact the beta administrator.",
  });
  expect((await request.get("/api/tasks/not-found")).status()).toBe(401);
});

test("form action submits multipart config promptly, polls output, and never puts credentials in browser assets", async ({
  context,
  page,
}) => {
  await authenticate(context);
  const responses: Array<Promise<string>> = [];
  page.on("response", (response) => {
    if (
      response.url().startsWith(testBaseURL) &&
      (response.request().resourceType() === "script" ||
        response.request().method() === "POST")
    )
      responses.push(response.text().catch(() => ""));
  });
  await page.goto("/boards/new");
  await page.locator('input[type="file"]').setInputFiles({
    name: "beta-test.bodealer.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify(
        createBoardFile({
          name: "Beta integration",
          description: "Opening lead analysis",
          hand: "K865 AK1083 Q74 K",
          taskType: "ONE_SIDED_BIDDING_LEVEL",
          contractLevel: "3",
          contractStrain: "NT",
          contractDeclarer: "N",
          boardsK: "10",
          postmortem: "AUTO",
        }),
      ),
    ),
  });
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page.locator(".walrus-console").first()).toContainText(
    "Partial Walrus output",
    { timeout: 15000 },
  );
  await expect(page.locator(".walrus-console").first()).toContainText(
    "Final Walrus output",
  );
  const upload = (await backendRequests()).find((entry) =>
    entry.body.includes("TASK NAME:Beta integration"),
  );
  expect(upload?.method).toBe("POST");
  expect(upload?.contentType).toContain("multipart/form-data; boundary=");
  expect(upload?.body).toContain('name="configFile"');
  expect(upload?.body).toContain("PRIMARY SCORER: V3N BY N");
  expect(upload?.body).toContain(
    "----------\nBeta integration\nOpening lead analysis\n",
  );
  expect(upload?.authorization).toBe(
    `Bearer ${testEnvironment.BACKEND_API_TOKEN}`,
  );
  for (const text of [
    ...(await Promise.all(responses)),
    await page.content(),
  ]) {
    for (const secret of [
      testEnvironment.BETA_PASSWORD,
      testEnvironment.SESSION_SECRET,
      testEnvironment.BACKEND_API_TOKEN,
      testEnvironment.BODEALER_API_URL,
    ])
      expect(text).not.toContain(secret);
  }
  await page.getByLabel("Declarer", { exact: true }).selectOption("S");
  await expect(
    page.getByText("Settings have changed.", { exact: false }),
  ).toBeVisible();
  // A previously rendered server action cannot be used after the session is removed.
  await context.clearCookies();
  await page.getByRole("button", { name: "Run again", exact: true }).click();
  await expect(page).toHaveURL(`${testBaseURL}/login`);
});

test("cross-origin mutations and task bursts are rejected before backend calls", async ({
  context,
}) => {
  await authenticate(context);
  const before = (await backendRequests()).length;
  for (const path of ["/api/tasks", "/logout"])
    expect(
      (
        await context.request.post(path, {
          headers: { Origin: "https://untrusted.example" },
          data: {},
        })
      ).status(),
    ).toBe(403);
  expect(
    (
      await context.request.delete("/api/tasks/task-test", {
        headers: { Origin: "https://untrusted.example" },
      })
    ).status(),
  ).toBe(403);
  expect((await backendRequests()).length).toBe(before);
  const headers = { ...origin, "x-forwarded-for": "192.0.2.111" };
  let blocked = false;
  for (let index = 0; index < 11; index += 1) {
    const response = await context.request.post("/api/tasks", {
      headers,
      data: { task: "rate-limit-test" },
    });
    if (response.status() === 429) {
      blocked = true;
      expect(response.headers()["retry-after"]).toBeTruthy();
      break;
    }
  }
  expect(blocked).toBe(true);
});

test("password attempts have a local burst limit", async ({
  page,
  context,
}) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": "192.0.2.112" });
  await page.goto("/login");
  for (let index = 0; index < 6; index += 1) {
    await page.getByLabel("Beta password").fill("incorrect");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page.locator("#login-error")).toContainText(
      index === 5 ? "Too many attempts" : "Incorrect password",
    );
    await expect(
      page.getByRole("button", { name: "Sign In", exact: true }),
    ).toBeEnabled();
  }
});
