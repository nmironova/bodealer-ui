import { readFile } from "node:fs/promises";
import { expect, test } from "./fixtures/browser";
import board from "./fixtures/abc123.bodealer.json";
import { testEnvironment } from "./fixtures/test-env.mjs";

async function loadBoard(page: import("@playwright/test").Page, name: string) {
  await page.goto("/boards/new");
  await page.locator('input[type="file"]').setInputFiles({
    name: "workbench.bodealer.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ ...board, values: { ...board.values, name } }),
    ),
  });
}

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `workbench-test-${testInfo.testId}`,
  });
});

test("initial hand stays vertical and invalid ranges/incomplete hands block execution", async ({
  page,
}) => {
  await loadBoard(page, "Validation example");
  await expect(page.locator(".suit-summary-row")).toHaveCount(4);
  const spades = page.getByRole("group", { name: "Spades", exact: true });
  await expect(
    spades.getByRole("button", { name: "Spades 10", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await spades.getByRole("button", { name: "Spades 10", exact: true }).click();
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "exactly 13 valid" }),
  ).toBeVisible();
  await expect(page.locator("[data-mode=setup]")).toBeVisible();
  await spades.getByRole("button", { name: "Spades 10", exact: true }).click();
  await page.locator('input[name="partner.hcpMin"]').fill("20");
  await expect(
    page.getByText("Minimum must not exceed maximum."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "cannot be greater" }),
  ).toBeVisible();
  await expect(page.locator("[data-mode=setup]")).toBeVisible();
});

test("workbench editing preserves output, closed-drawer values save, and rerun uses current settings", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 1000 });
  await loadBoard(page, "Hybrid workbench");
  await page.screenshot({
    path: "artifacts/workbench/desktop-setup.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Analysis complete", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  const console = page.locator(".walrus-console").first();
  const original = await console.textContent();
  const setup = await page.locator(".analysis-setup").boundingBox();
  const results = await page.locator(".results-panel").boundingBox();
  expect(results!.x).toBeGreaterThan(setup!.x + setup!.width);
  await page.screenshot({
    path: "artifacts/workbench/desktop-workbench.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit displayed hand" }).click();
  const handEditor = page.getByRole("dialog", {
    name: "Edit hand",
    exact: true,
  });
  await expect(handEditor).toBeVisible();
  await page
    .getByLabel("Selected hand", { exact: true })
    .fill("109542 95 QJ10 AQ");
  await handEditor
    .getByRole("button", { name: "Spades A", exact: true })
    .click();
  await handEditor
    .getByRole("button", { name: "Close Edit hand", exact: true })
    .click();
  await expect(console).toHaveText(original!);
  await expect(
    page.getByText("Settings modified", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Edit South (Partner) restrictions",
      exact: true,
    })
    .click();
  const restrictions = page.getByRole("dialog", {
    name: "Edit restrictions",
    exact: true,
  });
  await restrictions.locator('input[name="partner.hcpMin"]').fill("15");
  await restrictions
    .getByRole("button", { name: "Close Edit restrictions", exact: true })
    .click();
  await expect(console).toHaveText(original!);
  await page
    .getByRole("button", { name: "Edit calculation", exact: true })
    .click();
  const calculation = page.getByRole("dialog", {
    name: "Edit calculation",
    exact: true,
  });
  await calculation.getByRole("button", { name: "3", exact: true }).click();
  await calculation.getByRole("button", { name: "NT", exact: true }).click();
  await calculation.getByLabel("Declarer", { exact: true }).selectOption("N");
  await calculation
    .getByRole("button", { name: "Close Edit calculation", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const downloaded = await downloadPromise;
  const saved = JSON.parse(await readFile((await downloaded.path())!, "utf8"));
  expect(saved.values.hand).toBe("A109542 95 QJ10 AQ");
  expect(saved.values["partner.hcpMin"]).toBe("15");
  expect(saved.values.contractStrain).toBe("NT");
  expect(saved.values.contractDeclarer).toBe("N");
  await page.getByRole("button", { name: "Run again", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Analysis complete", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByText("Settings modified", { exact: true }),
  ).toHaveCount(0);
  const requests = await (
    await fetch(`${testEnvironment.BODEALER_API_URL}/__test__/requests`)
  ).json();
  const uploads = requests.filter(
    (request: { method: string; body: string }) =>
      request.method === "POST" &&
      request.body.includes("TASK NAME:Hybrid workbench"),
  );
  expect(uploads).toHaveLength(2);
  expect(uploads[1].body).toContain("HAND: N:AT9542.95.QJT.AQ");
  expect(uploads[1].body).toContain("PRIMARY SCORER: V3N BY N");
  expect(uploads[1].body).toContain("SOUTH: PointsRange, 15, 17");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(console).toHaveText(original!);
  await page
    .locator('input[type="file"]')
    .setInputFiles((await downloaded.path())!);
  await expect(
    page.getByRole("button", { name: "Edit displayed hand" }),
  ).toContainText("A 10 9 5 4 2");
  await expect(console).toHaveText(original!);
});

test("mobile Setup/Results tabs preserve long raw output, Copy/Expand and hand drawer edits", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const raw =
    "Senior kibitzer Oscar is observing a task:\n" +
    "  NORTH       EAST       SOUTH       WEST\n" +
    Array.from(
      { length: 120 },
      (_, index) =>
        `${String(index).padStart(3)}: ${"aligned output column     ".repeat(12)}`,
    ).join("\n") +
    "\n";
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.route(/\/api\/tasks\/task-\d+$/, (route) =>
    route.fulfill({ json: { status: "completed", resultText: raw } }),
  );
  await loadBoard(page, "Mobile workbench");
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Results", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("heading", { name: "Analysis complete", exact: true }),
  ).toBeVisible();
  const console = page.locator(".walrus-console").first();
  expect(await console.textContent()).toBe(raw);
  expect(
    await console.evaluate(
      (element) =>
        element.scrollWidth > element.clientWidth &&
        element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  expect(
    await console.evaluate((element) => getComputedStyle(element).whiteSpace),
  ).toBe("pre");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/workbench/mobile-results.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(raw);
  await page.getByRole("button", { name: "Expand" }).click();
  const expanded = page.getByRole("dialog", {
    name: "Raw output (Walrus)",
    exact: true,
  });
  await expect(expanded).toBeVisible();
  expect(await expanded.locator("pre").textContent()).toBe(raw);
  await page.keyboard.press("Escape");
  await expect(expanded).not.toBeVisible();
  await page.getByRole("tab", { name: "Setup", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
  await expect(console).not.toBeVisible();
  await page.getByRole("button", { name: "Edit hand", exact: true }).click();
  const handEditor = page.getByRole("dialog", {
    name: "Edit hand",
    exact: true,
  });
  await expect(handEditor).toBeVisible();
  expect((await handEditor.boundingBox())!.width).toBeLessThanOrEqual(390);
  await handEditor
    .getByRole("button", { name: "Close Edit hand", exact: true })
    .click();
  await page.getByRole("tab", { name: "Results", exact: true }).click();
  expect(await console.textContent()).toBe(raw);
  await page
    .getByRole("button", { name: "Edit & run again", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Setup", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

test("suit points, shape filters and advanced any/exclusion groups survive Save/Load", async ({
  page,
}) => {
  await loadBoard(page, "Advanced restrictions");
  const south = page.locator("#restriction-partner");
  await south.getByText("Points in suit", { exact: false }).first().click();
  await south.locator('input[name="partner.heartsPointsMin"]').fill("3");
  await south.locator('input[name="partner.heartsPointsMax"]').fill("5");
  await south.locator('input[name="partner.noSixCardSuit"]').check();
  await page.locator(".advanced-editor > summary").click();
  await page
    .getByRole("button", { name: "Add any group", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add exclusion", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Add any group", exact: true })
    .click();
  for (const width of [1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Advanced restrictions overflow at ${width}px`,
    ).toBe(true);
  }

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const downloaded = await downloadPromise;
  const saved = JSON.parse(await readFile((await downloaded.path())!, "utf8"));
  expect(saved.values["partner.heartsPointsMin"]).toBe("3");
  expect(saved.values["partner.heartsPointsMax"]).toBe("5");
  expect(saved.values["partner.noSixCardSuit"]).toBe("true");
  const combinations = JSON.parse(saved.values.combinations);
  expect(combinations[0].type).toBe("anyInListBelow");
  expect(combinations[1].type).toBe("excludeCombination");
  expect(combinations[1].filters[1].type).toBe("anyInListBelow");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page
    .locator('input[type="file"]')
    .setInputFiles((await downloaded.path())!);
  await expect(
    page.locator('input[name="partner.heartsPointsMin"]'),
  ).toHaveValue("3");
  await expect(
    page.locator('input[name="partner.noSixCardSuit"]'),
  ).toBeChecked();
  expect(await page.locator('input[name="combinations"]').inputValue()).toBe(
    saved.values.combinations,
  );
});

test("running task can be cancelled from the mobile Results view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loadBoard(page, "Cancellation example");
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  const cancel = page.getByRole("button", { name: "Cancel task", exact: true });
  await expect(cancel).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Results", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await cancel.click();
  await expect(
    page.getByRole("heading", { name: "Analysis cancelled", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Setup", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Run again", exact: true }),
  ).toBeEnabled();
});

test("opponent No overcall checkboxes swap, save/load, summarize and reach the uploaded config", async ({
  page,
}) => {
  await loadBoard(page, "Opponent overcalls");
  const east = page.locator("#restriction-lho");
  const west = page.locator("#restriction-rho");
  await east.locator(":scope > summary").click();
  await east.getByLabel("No overcall", { exact: true }).check();
  await east.locator('input[name="lho.hcpMin"]').fill("6");
  await expect(
    west.getByLabel("No overcall", { exact: true }),
  ).not.toBeChecked();
  await expect(
    page
      .locator("#restriction-partner")
      .getByLabel("No overcall", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Swap LHO ↔ RHO" }).click();
  await expect(page.locator('input[name="rho.noOvercall"]')).toBeChecked();
  await expect(page.locator('input[name="lho.noOvercall"]')).not.toBeChecked();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const path = (await (await downloaded).path())!;
  const saved = JSON.parse(await readFile(path, "utf8"));
  expect(saved.values["rho.noOvercall"]).toBe("true");
  expect(saved.values["lho.noOvercall"]).toBeUndefined();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(path);
  await expect(page.locator('input[name="rho.noOvercall"]')).toBeChecked();
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Analysis complete", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole("button", {
      name: "Edit West (RHO) restrictions",
      exact: true,
    }),
  ).toContainText("No overcall");
  const requests = await (
    await fetch(`${testEnvironment.BODEALER_API_URL}/__test__/requests`)
  ).json();
  const upload = requests.find(
    (request: { method: string; body: string }) =>
      request.method === "POST" &&
      request.body.includes("TASK NAME:Opponent overcalls"),
  );
  expect(upload.body).toContain("WEST: NoOvercall");
  expect(upload.body).not.toContain("EAST: NoOvercall");
});
