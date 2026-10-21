import { describe, expect, it } from "vitest";
import { DEFAULT_DATABASE_PATH, readConfig } from "@/shared/infrastructure/config";

describe("readConfig", () => {
  it("uses the default database path when none is configured", () => {
    expect(readConfig({}).databasePath).toBe(DEFAULT_DATABASE_PATH);
    expect(readConfig({ DATABASE_PATH: "" }).databasePath).toBe(DEFAULT_DATABASE_PATH);
  });

  it("uses the configured database path", () => {
    expect(readConfig({ DATABASE_PATH: "/data/app.db" }).databasePath).toBe("/data/app.db");
  });

  it("enables secure cookies by default in production only", () => {
    expect(readConfig({ NODE_ENV: "production" }).secureCookies).toBe(true);
    expect(readConfig({ NODE_ENV: "development" }).secureCookies).toBe(false);
    expect(readConfig({}).secureCookies).toBe(false);
  });

  it("lets COOKIE_SECURE override the environment default", () => {
    expect(readConfig({ NODE_ENV: "production", COOKIE_SECURE: "false" }).secureCookies).toBe(false);
    expect(readConfig({ NODE_ENV: "development", COOKIE_SECURE: "true" }).secureCookies).toBe(true);
  });

  it("treats any value other than true as insecure", () => {
    expect(readConfig({ COOKIE_SECURE: "yes" }).secureCookies).toBe(false);
  });
});
