import { defineConfig, devices } from "@playwright/test";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: process.env.E2E_PRODUCTION
      ? "npm run start -- --hostname 0.0.0.0"
      : "npm run dev -- --hostname 0.0.0.0",
    url: "http://localhost:3000/entrar",
    reuseExistingServer: !process.env.CI && !process.env.E2E_PRODUCTION,
    timeout: 120000,
  },
});
