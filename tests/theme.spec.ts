import { expect, test } from "./fixtures/browser";
import board from "./fixtures/abc123.bodealer.json";

const root = "html";

test("theme persists, System follows device changes, and tabs synchronize", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/dashboard");
  const theme = page.getByRole("combobox", { name: "Color theme" });
  await expect(theme).toHaveValue("system");
  await expect(page.locator(root)).toHaveAttribute("data-theme", "light");
  await theme.selectOption("dark");
  await expect(page.locator(root)).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(theme).toHaveValue("dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator(root)).toHaveAttribute("data-theme", "dark");
  const other = await context.newPage();
  await other.goto("/boards/new");
  await other
    .getByRole("combobox", { name: "Color theme" })
    .selectOption("light");
  await expect(theme).toHaveValue("light");
  await expect(page.locator(root)).toHaveAttribute("data-theme", "light");
  await theme.selectOption("system");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(root)).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator(root)).toHaveAttribute("data-theme", "light");
  await other.close();
});

test("stored dark theme applies before hydration", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("bodealer-theme", "dark"),
  );
  await page.route("**/_next/**/*.js*", (route) => route.abort());
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.locator(root)).toHaveAttribute("data-theme", "dark");
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(13, 20, 32)");
});

for (const width of [1536, 390]) {
  test(`dark workbench preserves settings and keeps suits visible at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/boards/new");
    await page.locator('input[type="file"]').setInputFiles({
      name: "theme.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(board)),
    });
    const theme = page.getByRole("combobox", { name: "Color theme" });
    await expect(page.locator(root)).toHaveAttribute("data-theme", "dark");
    const colors = await page
      .locator(".hand-summary .suit-symbol")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
    expect(colors).toEqual([
      "rgb(230, 237, 247)",
      "rgb(255, 117, 127)",
      "rgb(255, 117, 127)",
      "rgb(230, 237, 247)",
    ]);
    await theme.selectOption("light");
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
      board.values.name,
    );
    await theme.selectOption("dark");
    const input = page.getByLabel("Name", { exact: true });
    await input.focus();
    expect(
      await input.evaluate((el) => getComputedStyle(el).outlineStyle),
    ).toBe("solid");
    await page.screenshot({
      path: `artifacts/theme/setup-dark-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Run analysis", exact: true })
      .last()
      .click();
    await expect(
      page.getByRole("heading", { name: "Analysis complete", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    const output = await page.locator(".walrus-console").first().textContent();
    await theme.selectOption("light");
    await theme.selectOption("dark");
    expect(await page.locator(".walrus-console").first().textContent()).toBe(
      output,
    );
    if (width === 390)
      await page.getByRole("tab", { name: "Setup", exact: true }).click();
    await page.getByRole("button", { name: "Edit hand", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Edit hand", exact: true });
    expect(
      await drawer.evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe("rgb(23, 33, 49)");
    await drawer
      .getByRole("button", { name: "Close Edit hand", exact: true })
      .click();
    await page
      .getByRole("button", { name: "View config", exact: true })
      .click();
    const config = page.getByRole("dialog", { name: "Configuration preview" });
    expect(
      await config.evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe("rgb(23, 33, 49)");
    expect(
      await config.locator("pre").evaluate((el) => getComputedStyle(el).color),
    ).toBe("rgb(199, 239, 197)");
    await config.getByRole("button", { name: "Close config preview" }).click();
    await page.screenshot({
      path: info.outputPath("workbench-dark.png"),
      fullPage: true,
    });
  });
}

test("login and dashboard use dark surfaces with readable content", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/dashboard");
  await page.screenshot({
    path: "artifacts/theme/dashboard-dark.png",
    fullPage: true,
  });
  await context.clearCookies();
  await page.goto("/login");
  await expect(page.getByRole("combobox", { name: "Color theme" })).toHaveValue(
    "system",
  );
  const card = page.locator("section[aria-labelledby=login-title]");
  expect(
    await card.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(23, 33, 49)");
  await page.getByLabel("Beta password").fill("incorrect-password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.locator("#login-error")).toContainText(
    "Incorrect password",
  );
  await page.screenshot({
    path: "artifacts/theme/login-dark.png",
    fullPage: true,
  });
});

test("theme still switches when browser storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage disabled");
      },
    });
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/boards/new");
  await page
    .getByRole("combobox", { name: "Color theme" })
    .selectOption("dark");
  await expect(page.locator(root)).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("combobox", { name: "Color theme" })).toHaveValue(
    "dark",
  );
});
