import { test, expect } from "./fixtures/browser";
import { testEnvironment } from "./fixtures/test-env.mjs";

const tasks = [
  ["run-old1", "running"],
  ["wait0002", "queued"],
  ["done0003", "completed"],
  ["run00004", "running"],
  ["done0005", "completed"],
  ["fail0006", "failed"],
  ["stop0007", "cancelled"],
].map(([id, status], index) => ({
  id,
  status,
  createdAt: `2026-11-16T${String(index + 10).padStart(2, "0")}:00:00Z`,
}));

test("real task listing proxy requires a session, uses Bearer auth and strips private fields", async ({
  context,
  browser,
}) => {
  const anonymous = await browser.newContext();
  try {
    expect(
      (await anonymous.request.get("http://localhost:3210/api/tasks")).status(),
    ).toBe(401);
  } finally {
    await anonymous.close();
  }
  await context.request.post("/api/tasks", {
    headers: { Origin: "http://localhost:3210" },
    data: {},
  });
  const response = await context.request.get("/api/tasks");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThan(0);
  expect(Object.keys(body[0]).sort()).toEqual(["createdAt", "id", "status"]);
  expect(JSON.stringify(body)).not.toContain(testEnvironment.BACKEND_API_TOKEN);
  expect(JSON.stringify(body)).not.toContain("/private");
  const requests = await (
    await fetch(`${testEnvironment.BODEALER_API_URL}/__test__/requests`)
  ).json();
  const listRequest = requests.findLast(
    (entry: { method: string; url: string }) =>
      entry.method === "GET" && entry.url === "/tasks",
  );
  expect(listRequest.authorization).toBe(
    `Bearer ${testEnvironment.BACKEND_API_TOKEN}`,
  );
});

test("summary counts and five recent analyses reflect data; dashboard navigation works", async ({
  page,
}) => {
  await page.route("**/api/tasks", (route) => route.fulfill({ json: tasks }));
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Your bridge workspace" }),
  ).toBeVisible();
  await expect(page.getByLabel("Running: 2", { exact: true })).toHaveText("2");
  await expect(page.getByLabel("Queued: 1", { exact: true })).toHaveText("1");
  await expect(page.getByLabel("Completed: 2", { exact: true })).toHaveText(
    "2",
  );
  const rows = page
    .getByRole("list", { name: "Recent analyses" })
    .getByRole("listitem");
  await expect(rows).toHaveCount(5);
  await expect(rows.first()).toContainText("Analysis stop0007");
  await expect(rows.first()).toContainText("Cancelled");
  await expect(rows.last()).toContainText("Analysis done0003");
  await expect(rows.first().locator("time")).toHaveAttribute(
    "dateTime",
    "2026-11-16T16:00:00Z",
  );
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(
    navigation.getByRole("link", { name: "Dashboard", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    navigation.getByRole("link", { name: "Tasks", exact: true }),
  ).toHaveAttribute("href", "/boards/running");
  await expect(
    navigation.getByRole("link", { name: "Completed", exact: true }),
  ).toHaveAttribute("href", "/boards/completed");
  await expect(page.getByRole("link", { name: "View all" })).toHaveAttribute(
    "href",
    "/boards/running",
  );
  await page
    .getByRole("main")
    .getByRole("link", { name: "New analysis", exact: true })
    .click();
  await expect(page).toHaveURL(/\/boards\/new$/);
  await expect(
    page.getByRole("heading", { name: "Analysis setup" }),
  ).toBeVisible();
});

test("empty dashboard matches the compact desktop layout", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/tasks", (route) => route.fulfill({ json: [] }));
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "No analyses yet" }),
  ).toBeVisible();
  await expect(page.getByLabel("Running: 0", { exact: true })).toHaveText("0");
  await expect(
    page.getByRole("link", { name: "Create a new analysis" }),
  ).toHaveAttribute("href", "/boards/new");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("dashboard-desktop.png") });
});

test("loading and failed data never appear as empty or zero; Retry recovers", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let attempts = 0;
  await page.route("**/api/tasks", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await gate;
      await route.fulfill({ status: 503, json: { error: "Unavailable" } });
    } else await route.fulfill({ json: [] });
  });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Loading analyses…" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No analyses yet" }),
  ).not.toBeVisible();
  await expect(
    page.getByLabel("Running: Loading", { exact: true }),
  ).not.toHaveText("0");
  release();
  await expect(
    page.getByRole("heading", { name: "Analyses unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Running: Unavailable", { exact: true }),
  ).toHaveText("—");
  await expect(
    page.getByRole("heading", { name: "No analyses yet" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "No analyses yet" }),
  ).toBeVisible();
});

test("mobile dashboard and navigation have no horizontal overflow", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/tasks", (route) => route.fulfill({ json: [] }));
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "No analyses yet" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page
      .getByRole("navigation")
      .getByRole("link", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("dashboard-mobile.png"),
    fullPage: true,
  });
});
