import { describe, expect, it, vi } from "vitest";
import { FLASH_COOKIE, getFlash, setFlash } from "@/lib/flash";
import { cookieJar } from "../helpers/cookie-jar";

describe("flash", () => {
  it("uses the documented cookie name", () => {
    expect(FLASH_COOKIE).toBe("snippetbox_flash");
  });

  it("returns null when no flash is set", async () => {
    expect(await getFlash()).toBeNull();
  });

  it("stores and reads back a message", async () => {
    await setFlash("Hello there");
    expect(await getFlash()).toBe("Hello there");
  });

  it("stores the flash for sixty seconds and readable by scripts", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("COOKIE_SECURE", "");
    await setFlash("Hello");
    expect(cookieJar.optionsOf(FLASH_COOKIE)).toMatchObject({
      httpOnly: false,
      maxAge: 60,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });

  it("overwrites the previous message", async () => {
    await setFlash("first");
    await setFlash("second");
    expect(await getFlash()).toBe("second");
  });

  it("returns an empty string for an empty cookie value", async () => {
    cookieJar.set(FLASH_COOKIE, "");
    expect(await getFlash()).toBe("");
  });
});
