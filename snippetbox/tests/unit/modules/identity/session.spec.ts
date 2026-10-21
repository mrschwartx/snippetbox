import { describe, expect, it } from "vitest";
import { SESSION_LIFETIME_MS, Session } from "@/modules/identity/domain/session";

const now = new Date("2026-10-15T08:00:00.000Z");

describe("Session", () => {
  it("lasts twelve hours from the moment it starts", () => {
    const session = Session.start("hash", 3, now);
    expect(SESSION_LIFETIME_MS).toBe(12 * 60 * 60 * 1000);
    expect(session.userId).toBe(3);
    expect(session.tokenHash).toBe("hash");
    expect(session.expiresAt.toISOString()).toBe("2026-10-15T20:00:00.000Z");
  });

  it("is active before it expires", () => {
    const session = Session.start("hash", 3, now);
    expect(session.isActiveAt(new Date("2026-10-15T19:59:59.999Z"))).toBe(true);
  });

  it("is inactive at the expiry instant and afterwards", () => {
    const session = Session.start("hash", 3, now);
    expect(session.isActiveAt(new Date("2026-10-15T20:00:00.000Z"))).toBe(false);
    expect(session.isActiveAt(new Date("2026-10-16T00:00:00.000Z"))).toBe(false);
  });

  it("can be restored from persisted state", () => {
    const expiresAt = new Date("2026-10-15T09:00:00.000Z");
    const session = Session.restore("hash", 9, expiresAt);
    expect(session.expiresAt).toEqual(expiresAt);
    expect(session.userId).toBe(9);
  });
});
