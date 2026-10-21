import { describe, expect, it } from "vitest";
import {
  CookieFlashStore,
  FLASH_COOKIE,
} from "@/modules/flash/infrastructure/cookie-flash-store";
import { baseCookieOptions } from "@/shared/infrastructure/http/cookie-jar";
import { InMemoryCookieJar } from "@tests/support/in-memory-cookie-jar";

describe("CookieFlashStore", () => {
  it("pops a message exactly once", async () => {
    const store = new CookieFlashStore(new InMemoryCookieJar(), {});
    await store.push("hello");
    expect(await store.pop()).toBe("hello");
    expect(await store.pop()).toBeNull();
  });

  it("stores the message in a short lived HttpOnly cookie", async () => {
    const jar = new InMemoryCookieJar();
    await new CookieFlashStore(jar, baseCookieOptions(false)).push("hello");

    expect(jar.optionsOf(FLASH_COOKIE)).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60,
    });
  });

  it("removes the cookie when the message is read", async () => {
    const jar = new InMemoryCookieJar();
    const store = new CookieFlashStore(jar, {});
    await store.push("hello");
    await store.pop();
    expect(jar.has(FLASH_COOKIE)).toBe(false);
  });
});
