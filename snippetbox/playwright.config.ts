import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = Number(process.env.E2E_PORT || 3100);
const baseURL = `http://127.0.0.1:${port}`;
const databasePath = join(tmpdir(), "snippetbox-e2e", "e2e.db");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node tests/e2e/reset-db.mjs && npm run build && npm run start -- --port ${port} --hostname 127.0.0.1`,
    url: `${baseURL}/ping`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { DATABASE_PATH: databasePath, COOKIE_SECURE: "false" },
  },
});
