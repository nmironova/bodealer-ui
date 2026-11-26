import { readFile } from "node:fs/promises";
import { expect, test } from "./fixtures/browser";
import board from "./fixtures/abc123.bodealer.json";
import { testEnvironment } from "./fixtures/test-env.mjs";
import { prepareTask } from "../app/lib/prepare-task";

for (const width of [1536, 390]) {
  test(`preview exports the exact multipart upload at ${width}px`, async ({
    page,
    context,
  }, info) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await context.setExtraHTTPHeaders({ "x-forwarded-for": info.testId });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/boards/new");
    await page.locator('input[type="file"]').setInputFiles({
      name: "example.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          ...board,
          values: { ...board.values, name: `Preview ${width}` },
        }),
      ),
    });
    await page
      .getByRole("button", { name: "View config", exact: true })
      .click();
    const viewer = page.getByRole("dialog", { name: "Configuration preview" });
    const code = viewer.getByLabel("Server config payload");
    const original = await code.textContent();
    expect(original).toContain(`TASK NAME:Preview ${width}`);
    if (width > 767) {
      await page
        .getByLabel("Name", { exact: true })
        .fill(`Updated preview ${width}`);
      await expect(code).toContainText(`TASK NAME:Updated preview ${width}`);
    }
    const displayed = await code.textContent();
    await viewer
      .getByRole("button", { name: "Copy config", exact: true })
      .click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      displayed,
    );
    const downloadPromise = page.waitForEvent("download");
    await viewer
      .getByRole("button", { name: "Download .txt", exact: true })
      .click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.txt$/);
    expect(await readFile((await download.path())!, "utf8")).toBe(displayed);
    await viewer.getByRole("button", { name: "Close config preview" }).click();
    await page
      .getByRole("button", { name: "Run analysis", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Analysis complete", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    const requests = await (
      await fetch(`${testEnvironment.BODEALER_API_URL}/__test__/requests`)
    ).json();
    const upload = requests.find(
      (r: { method: string; body: string }) =>
        r.method === "POST" &&
        r.body.includes(
          `TASK NAME:${width > 767 ? "Updated preview" : "Preview"} ${width}`,
        ),
    );
    const multipart = await new Response(upload.body, {
      headers: { "content-type": upload.contentType },
    }).formData();
    expect(await (multipart.get("configFile") as File).text()).toBe(displayed);
    await page
      .getByRole("button", { name: "View config", exact: true })
      .click();
    await expect(code).toHaveText(displayed!);
  });
}

test("invalid values block preview and submission without rounding", async ({
  page,
}) => {
  await page.goto("/boards/new");
  await page.getByRole("button", { name: "View config", exact: true }).click();
  const viewer = page.getByRole("dialog", { name: "Configuration preview" });
  await expect(viewer.getByText("Name is required.")).toBeVisible();
  await expect(
    viewer.getByRole("button", { name: "Copy config", exact: true }),
  ).toBeDisabled();
  await viewer.getByRole("button", { name: "Close config preview" }).click();
  await expect(
    page.getByRole("button", { name: "Run analysis", exact: true }),
  ).toBeDisabled();
  for (const [key, value] of [
    ["boardsK", "1.5"],
    ["partner.hcpMin", "5.7"],
    ["hand", "AAAAAAAAAAAAA - - -"],
  ]) {
    const data = new FormData();
    for (const [k, v] of Object.entries({ ...board.values, [key]: value }))
      data.set(k, v);
    expect(prepareTask(data).configText).toBeUndefined();
  }
});

test("preview regenerates for every configuration category and Clear", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.goto("/boards/new");
  await page.getByRole("button", { name: "View config", exact: true }).click();
  const changes: Record<string, string>[] = [
    { description: "Updated notes" },
    { hand: "A9542 95 QJ10 AQ10" },
    { "partner.hcpMin": "15" },
    { "lho.noOvercall": "true" },
    { "rho.clubsPointsMin": "2" },
    {
      combinations: JSON.stringify([
        {
          type: "anyInListBelow",
          seat: "partner",
          filters: [
            {
              type: "range",
              seat: "partner",
              filter: "ControlsRange",
              min: 2,
              max: 4,
            },
          ],
        },
      ]),
    },
    { taskType: "SEEK_OPENING_LEAD" },
    { contractLevel: "6" },
    { contractStrain: "NT" },
    { contractDeclarer: "N" },
    { boardsK: "20" },
    { postmortem: "SUIT" },
  ];
  let values: Record<string, string> = { ...board.values };
  let previous: string | undefined;
  for (const change of changes) {
    values = { ...values, ...change };
    await page.locator('input[type="file"]').setInputFiles({
      name: "settings.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ ...board, values })),
    });
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    const expected = prepareTask(data).configText;
    expect(expected).toBeDefined();
    expect(expected).not.toBe(previous);
    await expect(page.getByLabel("Server config payload")).toHaveText(
      expected!,
    );
    previous = expected;
  }
  await page.getByRole("button", { name: "Close config preview" }).click();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Run analysis", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "View config", exact: true }).click();
  await expect(page.getByLabel("Server config payload")).toHaveCount(0);
});
