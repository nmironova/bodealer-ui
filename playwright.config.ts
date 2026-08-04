import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",

  timeout: 30_000,

  outputDir:  "artifacts/test-results/",

  reporter: [
     ["list"],
     ["html", { outputFolder: "artifacts/report" }],
  ],
  expect: {
    timeout: 5000,
  },

  use: {
    baseURL: "http://localhost:3000",
    headless: false,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});