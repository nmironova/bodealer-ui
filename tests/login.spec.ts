import { expect, test } from "@playwright/test";

const cardSelector = "section[aria-labelledby='login-title']";

test("compact desktop login and password visibility support keyboard navigation", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  const card = await page.locator(cardSelector).boundingBox();
  expect(card!.width).toBeGreaterThanOrEqual(480);
  expect(card!.width).toBeLessThanOrEqual(520);
  expect(Math.abs(card!.x + card!.width / 2 - 720)).toBeLessThan(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Welcome to the table" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  const input = page.getByLabel("Beta password");
  await expect(input).toBeFocused();
  expect(
    await input.evaluate((element) => getComputedStyle(element).boxShadow),
  ).not.toBe("none");
  expect((await input.boundingBox())!.height).toBe(50);
  await input.fill("example-only");
  await expect(input).toHaveAttribute("type", "password");
  await page.keyboard.press("Tab");
  const toggle = page.getByRole("button", {
    name: "Show password",
    exact: true,
  });
  await expect(toggle).toBeFocused();
  expect(
    await toggle.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe("solid");
  await page.keyboard.press("Space");
  await expect(input).toHaveAttribute("type", "text");
  await expect(
    page.getByRole("button", { name: "Hide password", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Space");
  await expect(input).toHaveAttribute("type", "password");
  await expect(input).toHaveValue("example-only");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeFocused();
  await input.fill("");
  await page.getByRole("heading").click();
  await page.screenshot({ path: testInfo.outputPath("login-desktop.png") });
});

test("mobile login fits without overflow and remains usable in a short keyboard viewport", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  const card = await page.locator(cardSelector).boundingBox();
  expect(card!.x).toBeGreaterThanOrEqual(15);
  expect(card!.width).toBeLessThanOrEqual(358);
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("login-mobile.png") });
  await page.setViewportSize({ width: 390, height: 420 });
  const input = page.getByLabel("Beta password");
  await input.focus();
  await expect(input).toBeFocused();
  await expect(input).toBeInViewport();
  const submit = page.getByRole("button", { name: "Sign In", exact: true });
  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
