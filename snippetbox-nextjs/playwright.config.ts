import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DATABASE_PATH = process.env.E2E_DATABASE_PATH ?? ".e2e-data/snippetbox.db";
const executablePath = process.env.E2E_CHROMIUM_PATH || undefined;
const browserArgs = process.env.E2E_CHROMIUM_ARGS
  ? process.env.E2E_CHROMIUM_ARGS.split(" ")
  : [];

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { executablePath, args: browserArgs },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: `${BASE_URL}/ping`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      DATABASE_PATH,
      COOKIE_SECURE: "false",
    },
  },
});
