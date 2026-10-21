import { beforeEach, describe, expect, it } from "vitest";
import {
  CookieSessionTransport,
  SESSION_COOKIE,
} from "@/modules/identity/infrastructure/cookie-session-transport";
import { baseCookieOptions } from "@/shared/infrastructure/http/cookie-jar";
import { InMemoryCookieJar } from "@tests/support/in-memory-cookie-jar";

describe("CookieSessionTransport", () => {
  let jar: InMemoryCookieJar;
  let transport: CookieSessionTransport;

  beforeEach(() => {
    jar = new InMemoryCookieJar();
    transport = new CookieSessionTransport(jar, baseCookieOptions(true));
  });

  it("reads nothing when no cookie is set", async () => {
    expect(await transport.read()).toBeUndefined();
  });

  it("writes an HttpOnly, SameSite=Lax, Secure cookie that expires with the session", async () => {
    const expiresAt = new Date("2026-10-15T20:00:00.000Z");
    await transport.write("raw-token", expiresAt);

    expect(await transport.read()).toBe("raw-token");
    expect(jar.optionsOf(SESSION_COOKIE)).toEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
      expires: expiresAt,
    });
  });

  it("clears the cookie", async () => {
    await transport.write("raw-token", new Date());
    await transport.clear();
    expect(await transport.read()).toBeUndefined();
  });
});
