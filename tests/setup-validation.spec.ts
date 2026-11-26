import { expect, test } from "./fixtures/browser";

test("fresh and cleared setup defer required errors until the relevant field is left", async ({
  page,
}) => {
  await page.goto("/boards/new");
  const banner = page
    .getByRole("alert")
    .filter({ hasText: "Check your setup" });
  await expect(banner).toHaveCount(0);
  const runs = page.getByRole("button", { name: "Run analysis", exact: true });
  await expect(runs.first()).toBeDisabled();
  await expect(runs.last()).toBeDisabled();
  await page.getByLabel("Name", { exact: true }).focus();
  await page.getByLabel("Description", { exact: false }).focus();
  await expect(banner).toContainText("Name is required.");
  await expect(banner).not.toContainText("13 valid");
  await page.getByLabel("Name", { exact: true }).fill("My analysis");
  await expect(banner).toHaveCount(0);
  await page.getByLabel("Selected hand", { exact: true }).fill("AKQ - - -");
  await expect(banner).toHaveCount(0);
  await page.getByLabel("Name", { exact: true }).focus();
  await expect(banner).toContainText("exactly 13 valid, distinct cards");
  await page
    .getByLabel("Selected hand", { exact: true })
    .fill("K865 AK1083 Q74 K");
  await expect(banner).toHaveCount(0);
  await expect(runs.first()).toBeEnabled();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(banner).toHaveCount(0);
  await expect(runs.first()).toBeDisabled();
  await page.getByRole("button", { name: "View config", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Configuration preview" });
  await expect(preview).toContainText("Name is required.");
  await expect(preview).toContainText("exactly 13 valid, distinct cards");
});
