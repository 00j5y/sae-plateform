import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.{e2e,spec}.ts",
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: {
    command: "bun run dev",
    env: {
      ...process.env,
      E2E_TEST_MODE: "true"
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
