import { beforeEach, expect } from "vitest";
import { SessionManager } from "@/modules/identity/application/session-manager";
import { feature, given, scenario, thenExpect, when } from "@tests/support/bdd";
import {
  FixedClock,
  InMemorySessionCookie,
  InMemorySessionRepository,
  SequentialSessionTokens,
} from "@tests/support/in-memory";

feature("Session management", () => {
  let sessions: InMemorySessionRepository;
  let cookie: InMemorySessionCookie;
  let clock: FixedClock;
  let manager: SessionManager;

  beforeEach(() => {
    sessions = new InMemorySessionRepository();
    cookie = new InMemorySessionCookie();
    clock = new FixedClock();
    manager = new SessionManager(
      sessions,
      new SequentialSessionTokens(),
      cookie,
      clock,
    );
  });

  scenario("starting a session stores it and sets the cookie", async () => {
    await when("a session is started for user 5", () => manager.start(5));

    await thenExpect("the cookie carries the raw token and the repository only its digest", async () => {
      expect(cookie.token).toBe("token-1");
      expect(await sessions.findByTokenHash("token-1")).toBeNull();
      expect((await sessions.findByTokenHash("digest(token-1)"))?.userId).toBe(5);
    });

    await thenExpect("the cookie expires after twelve hours", () => {
      expect(cookie.expiresAt?.toISOString()).toBe("2026-10-15T20:00:00.000Z");
    });
  });

  scenario("starting a new session replaces the previous one", async () => {
    await given("an active session", () => manager.start(5));

    await when("another session is started", () => manager.start(5));

    await thenExpect("only the new session exists", async () => {
      expect(sessions.count).toBe(1);
      expect(await sessions.findByTokenHash("digest(token-1)")).toBeNull();
      expect(cookie.token).toBe("token-2");
    });
  });

  scenario("starting a session purges expired sessions", async () => {
    await given("a session that has since expired", async () => {
      await manager.start(1);
      cookie.token = undefined;
      clock.advanceHours(13);
    });

    await when("a different visitor starts a session", () => manager.start(2));

    await thenExpect("the expired session is gone", () => {
      expect(sessions.count).toBe(1);
    });
  });

  scenario("resolving without a cookie yields nothing", async () => {
    await thenExpect("no session is found", async () => {
      expect(await manager.resolve()).toBeNull();
    });
  });

  scenario("resolving a forged cookie yields nothing", async () => {
    await given("a cookie that matches no session", () => {
      cookie.token = "forged";
    });

    await thenExpect("no session is found", async () => {
      expect(await manager.resolve()).toBeNull();
    });
  });

  scenario("resolving an active session returns it", async () => {
    await given("an active session", () => manager.start(5));
    clock.advanceHours(11);

    const session = await when("it is resolved", () => manager.resolve());

    await thenExpect("it belongs to the user", () => {
      expect(session?.userId).toBe(5);
    });
  });

  scenario("resolving an expired session ends it", async () => {
    await given("a session", () => manager.start(5));
    clock.advanceHours(13);

    const session = await when("it is resolved after expiry", () => manager.resolve());

    await thenExpect("nothing is returned and everything is cleaned up", () => {
      expect(session).toBeNull();
      expect(cookie.token).toBeUndefined();
      expect(sessions.count).toBe(0);
    });
  });

  scenario("ending a session clears the cookie and the stored session", async () => {
    await given("an active session", () => manager.start(5));

    await when("it is ended", () => manager.end());

    await thenExpect("both are gone", () => {
      expect(cookie.token).toBeUndefined();
      expect(sessions.count).toBe(0);
    });
  });

  scenario("ending without a session does nothing", async () => {
    await when("an anonymous visitor ends the session", () => manager.end());

    await thenExpect("nothing breaks", () => {
      expect(sessions.count).toBe(0);
    });
  });
});
