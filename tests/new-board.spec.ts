import { expect, test } from "@playwright/test";

test.describe("New board", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/boards/new");
  });

  test("shows the default board configuration", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "New Board" }),
    ).toBeVisible();

    await expect(page.getByLabel("Task type")).toHaveValue(
      "ONE_SIDED_BIDDING_LEVEL",
    );

    await expect(page.getByLabel("Boards")).toHaveValue("10");
    await expect(page.getByLabel("Postmortem")).toHaveValue("AUTO");

    await expect(page.getByRole("button", { name: "Start" })).toBeEnabled();
  });

  test("allows changing the board configuration", async ({ page }) => {
    await page.getByLabel("Name").fill("Playwright test board");
    await page
      .getByLabel("Description")
      .fill("Board created by an end-to-end test");

    await page.getByLabel("Boards").fill("1");
    await page.getByLabel("Postmortem").selectOption("SUIT");

    await page
      .getByText("Contract", { exact: true })
      .locator("..")
      .getByRole("button", { name: "6", exact: true })
      .click();

    await page.getByRole("button", { name: "NT", exact: true }).click();

    await expect(page.getByLabel("Name")).toHaveValue("Playwright test board");
    await expect(page.getByLabel("Boards")).toHaveValue("1");
    await expect(page.getByLabel("Postmortem")).toHaveValue("SUIT");
  });

  test("shows validation errors when required data is missing", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Start" }).click();

    await expect(page).toHaveURL(/\/boards\/new/);
    await expect(page.getByText("Please fix the errors.")).toBeVisible();
    await expect(page.getByText("Name is required.")).toBeVisible();
    await expect(
      page.getByText("Hand must contain exactly 13 cards."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Start" })).toBeEnabled();
  });
});
