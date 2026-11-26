import { readFile } from "node:fs/promises";
import { expect, test } from "./fixtures/browser";
import board from "./fixtures/abc123.bodealer.json";

for (const width of [1536, 390]) {
  test(`duplicate Run and deferred hand collapse work at ${width}px`, async ({
    page,
  }, info) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": info.testId });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/boards/new");
    const runs = page.getByRole("button", {
      name: "Run analysis",
      exact: true,
    });
    await expect(runs).toHaveCount(2);
    await expect(runs.first()).toBeDisabled();
    await expect(runs.last()).toBeDisabled();
    await page.locator('input[type="file"]').setInputFiles({
      name: "board.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(board)),
    });
    const hand = page.locator(".hand-section");
    const selected = page.getByLabel("Selected hand", { exact: true });
    await expect(selected).toBeVisible();
    // Completing a hand doesn't interrupt editing. Leaving the section does.
    await selected.fill("109542 95 QJ10 AQ");
    await page.getByLabel("Name", { exact: true }).focus();
    await expect(selected).toBeVisible();
    await selected.fill(board.values.hand);
    await expect(selected).toBeVisible();
    await page.getByLabel("Name", { exact: true }).focus();
    await expect(selected).not.toBeVisible();
    await expect(
      hand.getByRole("button", { name: "Edit hand", exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
    await hand.getByRole("button", { name: "Edit displayed hand" }).click();
    await expect(selected).toBeFocused();
    await expect(selected).toHaveValue(board.values.hand);
    // Pointer interaction outside the hand collapses without discarding fields.
    await page.getByLabel("Name", { exact: true }).click();
    await expect(selected).not.toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const download = await downloadPromise;
    const saved = JSON.parse(await readFile((await download.path())!, "utf8"));
    expect(saved.values.hand).toBe(board.values.hand);
    await expect(runs.first()).toBeEnabled();
    await expect(runs.last()).toBeEnabled();
    await runs.first().click();
    const reruns = page.getByRole("button", { name: "Run again", exact: true });
    await expect(reruns.first()).toBeDisabled();
    await expect(
      page.getByRole("heading", { name: "Analysis complete", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    // On mobile the original action lives in the Setup tab, while the top action remains available.
    if (width === 390)
      await page.getByRole("tab", { name: "Setup", exact: true }).click();
    await expect(reruns.first()).toBeEnabled();
    await expect(reruns.last()).toBeEnabled();
  });
}
