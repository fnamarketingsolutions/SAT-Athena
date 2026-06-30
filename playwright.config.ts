import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Load .env so Clerk keys are visible to the test runner. Map the
// Next.js public key into the name @clerk/testing expects.
loadEnv();
if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

/**
 * Cross-browser visual harness for the micro-lesson whiteboard.
 *
 * Workflow:
 *   1. Start the Next.js dev server (`make dev`).
 *   2. Run `make visual-auth` ONCE — opens a browser, you log in
 *      manually, the storage state is saved.
 *   3. Run `make visual-test` to capture screenshots in chromium and
 *      webkit; outputs land in `.local/playwright/snapshots/`.
 *   4. Run `make visual-compare` to diff browsers + against baseline.
 */
export default defineConfig({
  testDir: ".local/playwright/tests",
  outputDir: ".local/playwright/.results",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: ".local/playwright/.report", open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "off",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "auth",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testMatch: /\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        storageState: ".local/playwright/.auth/state.json",
      },
      dependencies: ["auth"],
    },
    {
      name: "webkit",
      testMatch: /\.spec\.ts/,
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        storageState: ".local/playwright/.auth/state.json",
      },
      dependencies: ["auth"],
    },
  ],
});
