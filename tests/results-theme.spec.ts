import { expect, test } from "./fixtures/browser";
import board from "./fixtures/abc123.bodealer.json";

for (const width of [1536, 390]) {
  test(`results notes stay readable while starting, running and completed at ${width}px`, async ({
    page,
  }, info) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": info.testId });
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/boards/new");
    await page.locator('input[type="file"]').setInputFiles({
      name: "notes.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(board)),
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/boards/new", async (route) => {
      if (route.request().method() === "POST") await gate;
      await route.continue();
    });
    let status = "running";
    await page.route("**/api/tasks/*", (route) =>
      route.fulfill({ json: { status, resultText: "Walrus output\n" } }),
    );
    async function checkNotes(heading: string) {
      const title = page.getByRole("heading", { name: heading, exact: true });
      await expect(title).toBeVisible();
      const summary = title.locator("..");
      const styles = await summary.evaluate((el) => ({
        background: getComputedStyle(el).backgroundColor,
        colors: Array.from(el.children).map(
          (child) => getComputedStyle(child).color,
        ),
      }));
      expect(styles.background).toBe("rgb(30, 43, 62)");
      function luminance(color: string) {
        const values = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((n) => {
            const c = n / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
        return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
      }
      for (const color of styles.colors) {
        const foreground = luminance(color);
        const background = luminance(styles.background);
        expect(
          (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05),
        ).toBeGreaterThanOrEqual(4.5);
      }
      return summary;
    }
    await page
      .getByRole("button", { name: "Run analysis", exact: true })
      .first()
      .click();
    try {
      await checkNotes("Preparing your analysis");
    } finally {
      release();
    }
    const summary = await checkNotes("Analysis in progress");
    await expect(summary).toContainText("Task ");
    await page.screenshot({
      path: `artifacts/theme/running-notes-${width}.png`,
      fullPage: true,
    });
    status = "completed";
    const completedSummary = await checkNotes("Analysis complete");
    await page
      .getByRole("combobox", { name: "Color theme" })
      .selectOption("light");
    await expect(completedSummary).toHaveCSS(
      "background-color",
      "rgba(248, 250, 252, 0.7)",
    );
  });
}
