import { expect, test } from "@playwright/test";
import { createBoardFile } from "../app/lib/board-config-file";

const pageUrl = "http://127.0.0.1:3000/boards/new";

test("loads, edits, swaps and saves the existing board format", async ({
  page,
}) => {
  await page.goto(pageUrl);
  await page.locator('input[type="file"]').setInputFiles({
    name: "example.bodealer.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify(
        createBoardFile({
          name: "Test board",
          hand: "K865 AK1083 Q74 K",
          "lho.hcpMin": "7",
          "lho.hcpMax": "8",
        }),
      ),
    ),
  });
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Test board",
  );
  await expect(page.getByText("13 / 13 cards", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit displayed hand" }).click();
  await expect(page.getByLabel("Selected hand", { exact: true })).toBeFocused();
  // Opening via the board and closing via the existing action stay in sync.
  await page.getByText("Edit hand", { exact: true }).click();
  const handDisplay = page.getByRole("button", { name: "Edit displayed hand" });
  await expect(handDisplay).toHaveAttribute("aria-expanded", "false");
  await handDisplay.focus();
  await page.keyboard.press("Enter");
  await expect(handDisplay).toHaveAttribute("aria-expanded", "true");
  await page
    .getByLabel("Selected hand", { exact: true })
    .fill("K865 AK1083 Q74 -");
  await expect(page.getByText("12 / 13 cards", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Swap LHO ↔ RHO" }).click();
  const west = page
    .locator("details.restriction-row")
    .filter({ hasText: "West (RHO)" });
  await expect(west.locator(":scope > summary")).toContainText("HCP 7-8");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect((await download).suggestedFilename()).toContain("test-board");
});

test("console expands, closes with Escape and collapses", async ({ page }) => {
  await page.goto(pageUrl);
  await page.getByRole("button", { name: "Expand" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const output = page.locator("details").filter({
    has: page.locator("summary", { hasText: "Raw output (Walrus)" }),
  });
  await output.locator("summary").click();
  await expect(output.locator("pre")).not.toBeVisible();
});

test("stacks without horizontal page overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pageUrl);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const setup = await page.locator(".analysis-setup").boundingBox();
  const results = await page.locator(".results-panel").boundingBox();
  expect(results!.y).toBeGreaterThan(setup!.y + setup!.height);
});

test("desktop keeps setup and results side by side with the run action visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto(pageUrl);
  const setup = await page.locator(".analysis-setup").boundingBox();
  const results = await page.locator(".results-panel").boundingBox();
  expect(results!.x).toBeGreaterThan(setup!.x + setup!.width);
  await page.screenshot({ path: "/tmp/bodealer-desktop.png", fullPage: true });
  await expect(
    page.getByRole("button", { name: "Run analysis" }),
  ).toBeInViewport();
});

test("declarer selection survives save/load and Clear restores Partner", async ({
  page,
}) => {
  await page.goto(pageUrl);
  const declarer = page.getByLabel("Declarer", { exact: true });
  await expect(declarer).toHaveValue("S");
  await declarer.selectOption("N");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const download = await downloadPromise;
  const savedFile = await download.path();
  expect(savedFile).not.toBeNull();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(declarer).toHaveValue("S");
  await page.locator('input[type="file"]').setInputFiles(savedFile!);
  await expect(declarer).toHaveValue("N");
});
