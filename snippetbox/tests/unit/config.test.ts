import { describe, expect, it, vi } from "vitest";
import { cookieOptions } from "@/lib/config";

describe("cookieOptions", () => {
  it("is always httpOnly, lax and site wide", () => {
    const options = cookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  it("is secure in production by default", () => {
    vi.stubEnv("COOKIE_SECURE", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(cookieOptions().secure).toBe(true);
  });

  it("is not secure outside production by default", () => {
    vi.stubEnv("COOKIE_SECURE", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(cookieOptions().secure).toBe(false);
  });

  it("lets COOKIE_SECURE=false override production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("COOKIE_SECURE", "false");
    expect(cookieOptions().secure).toBe(false);
  });

  it("lets COOKIE_SECURE=true override development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("COOKIE_SECURE", "true");
    expect(cookieOptions().secure).toBe(true);
  });

  it("treats any value other than true as insecure when set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("COOKIE_SECURE", "yes");
    expect(cookieOptions().secure).toBe(false);
  });
});
