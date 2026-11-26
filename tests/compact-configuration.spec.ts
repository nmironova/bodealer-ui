import { readFile } from "node:fs/promises";
import { expect, test } from "./fixtures/browser";
import board from "./fixtures/abc123.bodealer.json";

for (const theme of ["light", "dark"] as const) {
  for (const width of [1536, 1024, 390]) {
    test(`compact configuration aligns and preserves editors at ${width}px in ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1100 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/boards/new");
      await page.locator('input[type="file"]').setInputFiles({
        name: "compact.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(board)),
      });
      const initialConfiguration = page.getByRole("region", {
        name: "Analysis configuration",
        exact: true,
      });
      await expect(
        initialConfiguration.getByRole("heading", {
          name: "Analysis configuration",
          exact: true,
        }),
      ).not.toBeVisible();
      const initialHand = initialConfiguration.locator(".hand-section");
      const initialCalculation = initialConfiguration.locator(
        ".calculation-section",
      );
      const initialHandBox = (await initialHand.boundingBox())!;
      expect(
        (await initialCalculation.boundingBox())!.y,
      ).toBeGreaterThanOrEqual(initialHandBox.y + initialHandBox.height);
      const summaryBox = (await initialHand
        .locator(".hand-summary")
        .boundingBox())!;
      const gridBox = (await initialHand.locator(".card-grid").boundingBox())!;
      const inputBox = (await initialHand
        .locator(".hand-text-editor")
        .boundingBox())!;
      expect(Math.abs(inputBox.x - gridBox.x)).toBeLessThan(2);
      expect(inputBox.y).toBeGreaterThanOrEqual(gridBox.y + gridBox.height);
      if (width > 760) {
        expect(gridBox.x - (summaryBox.x + summaryBox.width)).toBeCloseTo(
          16,
          0,
        );
        expect(Math.abs(gridBox.y - summaryBox.y)).toBeLessThan(2);
        expect(summaryBox.width).toBeCloseTo(155, 0);
        expect(summaryBox.width).toBeLessThan(gridBox.width);
        for (const suit of ["Spades", "Hearts", "Diamonds", "Clubs"]) {
          const ranks = initialHand
            .getByRole("group", { name: suit, exact: true })
            .getByRole("button");
          await expect(ranks).toHaveCount(13);
          const bounds = await ranks.evaluateAll((elements) =>
            elements.map((el) => {
              const r = el.getBoundingClientRect();
              return { top: r.top, right: r.right };
            }),
          );
          expect(new Set(bounds.map((b) => Math.round(b.top))).size).toBe(1);
          expect(Math.max(...bounds.map((b) => b.right))).toBeLessThanOrEqual(
            gridBox.x + gridBox.width + 1,
          );
        }
      }
      if (width <= 760)
        expect(gridBox.y - (summaryBox.y + summaryBox.height)).toBeCloseTo(
          16,
          0,
        );
      await page.screenshot({
        path: `artifacts/workbench/expanded-${theme}-${width}.png`,
        fullPage: true,
      });
      await page.getByLabel("Name", { exact: true }).click();
      const configuration = page.getByRole("region", {
        name: "Analysis configuration",
        exact: true,
      });
      const hand = configuration.locator(".hand-section");
      const calculation = configuration.locator(".calculation-section");
      await expect(hand).toHaveAttribute("data-collapsed", "true");
      await expect(calculation).toHaveAttribute("data-collapsed", "true");
      await expect(hand.locator(".suit-summary-row")).toHaveCount(4);
      const handBox = (await hand.boundingBox())!;
      const calculationBox = (await calculation.boundingBox())!;
      if (width > 760) {
        expect(calculationBox.x).toBeGreaterThanOrEqual(
          handBox.x + handBox.width,
        );
        expect(Math.abs(calculationBox.y - handBox.y)).toBeLessThan(2);
        expect((await configuration.boundingBox())!.height).toBeLessThan(260);
      } else
        expect(calculationBox.y).toBeGreaterThanOrEqual(
          handBox.y + handBox.height,
        );
      if (width > 1050) {
        const restrictions = (await page
          .locator(".restrictions-section")
          .boundingBox())!;
        const configBox = (await configuration.boundingBox())!;
        expect(restrictions.x).toBeGreaterThanOrEqual(
          configBox.x + configBox.width,
        );
      }
      await page
        .getByRole("button", { name: "Edit calculation", exact: true })
        .click();
      const editor = page.getByRole("group", {
        name: "Edit calculation",
        exact: true,
      });
      await expect(editor).toBeVisible();
      expect((await calculation.boundingBox())!.width).toBeGreaterThan(
        (await configuration.boundingBox())!.width - 40,
      );
      await editor
        .getByLabel("Task type", { exact: true })
        .selectOption("SEEK_OPENING_LEAD");
      await editor.getByRole("button", { name: "7", exact: true }).click();
      await editor.getByRole("button", { name: "♥", exact: true }).click();
      await editor.getByLabel("Declarer", { exact: true }).selectOption("N");
      await editor.getByLabel("Boards", { exact: true }).fill("20");
      await editor
        .getByLabel("Postmortem", { exact: true })
        .selectOption("SUIT");
      await page
        .getByRole("button", { name: "Hide calculation", exact: true })
        .click();
      await expect(calculation).toContainText("7♥");
      await expect(calculation).toContainText("North declares");
      await expect(calculation).toContainText("20,000 deals");
      await expect(calculation).toContainText("SUIT");
      await expect(calculation).toContainText("Seek opening lead");
      await page.screenshot({
        path: `artifacts/workbench/compact-${theme}-${width}.png`,
        fullPage: true,
      });
      await hand
        .getByRole("button", { name: "Edit hand", exact: true })
        .click();
      await expect(
        page.getByLabel("Selected hand", { exact: true }),
      ).toHaveValue(board.values.hand);
      expect((await hand.boundingBox())!.width).toBeGreaterThan(
        (await configuration.boundingBox())!.width - 40,
      );
      await page
        .getByRole("button", { name: "Hide cards", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Edit calculation", exact: true })
        .click();
      await expect(editor.getByLabel("Boards", { exact: true })).toHaveValue(
        "20",
      );
      await expect(editor.getByLabel("Declarer", { exact: true })).toHaveValue(
        "N",
      );
      await page
        .getByRole("button", { name: "Hide calculation", exact: true })
        .click();
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      const saved = JSON.parse(
        await readFile((await (await downloadPromise).path())!, "utf8"),
      );
      expect(saved.values.hand).toBe(board.values.hand);
      expect(saved.values.contractLevel).toBe("7");
      expect(saved.values.contractStrain).toBe("H");
      expect(saved.values.contractDeclarer).toBe("N");
      expect(saved.values.taskType).toBe("SEEK_OPENING_LEAD");
      expect(saved.values.boardsK).toBe("20");
      expect(saved.values.postmortem).toBe("SUIT");
      expect(saved.values["partner.hcpMin"]).toBe(
        board.values["partner.hcpMin"],
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
}
