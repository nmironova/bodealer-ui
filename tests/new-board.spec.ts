import { expect, test } from "./fixtures/browser";
import { createBoardFile } from "../app/lib/board-config-file";

const pageUrl = "/boards/new";

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

test("initial setup is spacious, inline, and has no horizontal overflow on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pageUrl);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByLabel("Selected hand", { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("group", { name: "Spades", exact: true })
      .getByRole("button"),
  ).toHaveCount(13);
  await expect(page.locator(".results-panel")).not.toBeVisible();
});

test("desktop initial setup shows hand, restrictions, calculation and the run action", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto(pageUrl);
  await expect(
    page.getByRole("heading", { name: "Analysis setup", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "North · Your hand" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Restrictions", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Calculation", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Run analysis", exact: true }).last(),
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
  const savedFile = await (await downloadPromise).path();
  expect(savedFile).not.toBeNull();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(declarer).toHaveValue("S");
  await page.locator('input[type="file"]').setInputFiles(savedFile!);
  await expect(declarer).toHaveValue("N");
});
