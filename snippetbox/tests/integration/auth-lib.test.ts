import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  checkCredentials,
  createUser,
  endSession,
  findUserByEmail,
  getCurrentUser,
  startSession,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { cookieJar } from "../helpers/cookie-jar";

const SESSION = "snippetbox_session";
const HOUR = 60 * 60 * 1000;
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

async function seedUser(email = "ada@example.com", password = "password123", name = "Ada") {
  await createUser(name, email, password);
  return findUserByEmail(email)!;
}

const sessionRows = () =>
  getDb().prepare("SELECT token_hash, user_id, expires_at FROM sessions").all() as {
    token_hash: string;
    user_id: number;
    expires_at: string;
  }[];

describe("createUser and findUserByEmail", () => {
  it("returns undefined for an unknown email", () => {
    expect(findUserByEmail("nobody@example.com")).toBeUndefined();
  });

  it("trims the name and lowercases the email", async () => {
    await createUser("  Ada Lovelace  ", "  ADA@Example.COM ", "password123");
    expect(findUserByEmail("ada@example.com")).toMatchObject({ name: "Ada Lovelace", email: "ada@example.com" });
  });

  it("finds a user regardless of email case or padding", async () => {
    await seedUser("ada@example.com");
    expect(findUserByEmail("  ADA@EXAMPLE.COM ")).toBeDefined();
  });

  it("never stores the plain password", async () => {
    const user = await seedUser("ada@example.com", "password123");
    expect(user.password_hash).not.toContain("password123");
    expect(user.password_hash.startsWith("pbkdf2$")).toBe(true);
  });

  it("rejects a duplicate email", async () => {
    await seedUser("ada@example.com");
    await expect(createUser("Other", "ADA@example.com", "password123")).rejects.toThrow(/UNIQUE/);
  });

  it("records a creation timestamp", async () => {
    const before = Date.now();
    await seedUser();
    const row = getDb().prepare("SELECT created FROM users").get() as { created: string };
    expect(new Date(row.created).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });
});

describe("checkCredentials", () => {
  it("returns the user for the right password", async () => {
    await seedUser("ada@example.com", "password123");
    const user = await checkCredentials("ada@example.com", "password123");
    expect(user).toMatchObject({ email: "ada@example.com", name: "Ada" });
  });

  it("is case insensitive on the email", async () => {
    await seedUser("ada@example.com", "password123");
    expect(await checkCredentials("ADA@Example.com", "password123")).not.toBeNull();
  });

  it("returns null for a wrong password", async () => {
    await seedUser("ada@example.com", "password123");
    expect(await checkCredentials("ada@example.com", "wrong-password")).toBeNull();
  });

  it("returns null for an unknown email", async () => {
    expect(await checkCredentials("ghost@example.com", "password123")).toBeNull();
  });

  it("is case sensitive on the password", async () => {
    await seedUser("ada@example.com", "Password123");
    expect(await checkCredentials("ada@example.com", "password123")).toBeNull();
  });

  it("rejects an empty password", async () => {
    await seedUser();
    expect(await checkCredentials("ada@example.com", "")).toBeNull();
  });

  it("rejects a corrupted stored hash instead of throwing", async () => {
    await seedUser("ada@example.com", "password123");
    getDb().prepare("UPDATE users SET password_hash = 'garbage'").run();
    expect(await checkCredentials("ada@example.com", "password123")).toBeNull();
  });

  it("rejects a stored hash with a different algorithm", async () => {
    await seedUser("ada@example.com", "password123");
    getDb().prepare("UPDATE users SET password_hash = 'md5$1$c2FsdA==$aGFzaA=='").run();
    expect(await checkCredentials("ada@example.com", "password123")).toBeNull();
  });

  it("supports unicode passwords", async () => {
    await seedUser("ada@example.com", "pässwörd-密码-🔑");
    expect(await checkCredentials("ada@example.com", "pässwörd-密码-🔑")).not.toBeNull();
    expect(await checkCredentials("ada@example.com", "passwörd-密码-🔑")).toBeNull();
  });
});

describe("startSession", () => {
  it("sets a hardened session cookie that lasts twelve hours", async () => {
    vi.stubEnv("COOKIE_SECURE", "true");
    const user = await seedUser();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-22T00:00:00.000Z"));
    await startSession(user.id);

    expect(cookieJar.get(SESSION)?.value).toMatch(/^[0-9a-f]{64}$/);
    const options = cookieJar.optionsOf(SESSION) as Record<string, unknown>;
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", secure: true });
    expect((options.expires as Date).toISOString()).toBe("2026-10-22T12:00:00.000Z");
  });

  it("stores only the hash of the token", async () => {
    const user = await seedUser();
    await startSession(user.id);
    const token = cookieJar.get(SESSION)!.value;
    const rows = sessionRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).toBe(digest(token));
    expect(rows[0].token_hash).not.toBe(token);
    expect(rows[0].user_id).toBe(user.id);
  });

  it("issues a different token each time", async () => {
    const user = await seedUser();
    await startSession(user.id);
    const first = cookieJar.get(SESSION)!.value;
    cookieJar.clear();
    await startSession(user.id);
    expect(cookieJar.get(SESSION)!.value).not.toBe(first);
  });

  it("invalidates the previous session when logging in again", async () => {
    const user = await seedUser();
    await startSession(user.id);
    const previous = cookieJar.get(SESSION)!.value;
    await startSession(user.id);
    const hashes = sessionRows().map((row) => row.token_hash);
    expect(hashes).toHaveLength(1);
    expect(hashes).not.toContain(digest(previous));
  });

  it("purges expired sessions of other users", async () => {
    const user = await seedUser();
    getDb()
      .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ('stale', ?, '2000-01-01T00:00:00.000Z')")
      .run(user.id);
    await startSession(user.id);
    expect(sessionRows().map((row) => row.token_hash)).not.toContain("stale");
  });

  it("keeps live sessions that belong to other browsers", async () => {
    const user = await seedUser();
    await startSession(user.id);
    const otherBrowser = digest(cookieJar.get(SESSION)!.value);
    cookieJar.clear();
    await startSession(user.id);
    expect(sessionRows().map((row) => row.token_hash)).toContain(otherBrowser);
  });
});

describe("getCurrentUser", () => {
  it("returns null without a cookie", async () => {
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns the signed in user without the password hash", async () => {
    const user = await seedUser("ada@example.com");
    await startSession(user.id);
    const current = await getCurrentUser();
    expect(current).toEqual({ id: user.id, name: "Ada", email: "ada@example.com" });
    expect(current).not.toHaveProperty("password_hash");
  });

  it("returns null for an unknown token", async () => {
    cookieJar.set(SESSION, "f".repeat(64));
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns null when the session has expired", async () => {
    const user = await seedUser();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-22T00:00:00.000Z"));
    await startSession(user.id);
    vi.setSystemTime(new Date(Date.parse("2026-10-22T00:00:00.000Z") + 12 * HOUR + 1));
    expect(await getCurrentUser()).toBeNull();
  });

  it("is still valid just before the twelve hour mark", async () => {
    const user = await seedUser();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-22T00:00:00.000Z"));
    await startSession(user.id);
    vi.setSystemTime(new Date(Date.parse("2026-10-22T00:00:00.000Z") + 12 * HOUR - 1000));
    expect(await getCurrentUser()).not.toBeNull();
  });

  it("does not accept the stored hash as a token", async () => {
    const user = await seedUser();
    await startSession(user.id);
    cookieJar.set(SESSION, sessionRows()[0].token_hash);
    expect(await getCurrentUser()).toBeNull();
  });

  it("stops working after the user is deleted", async () => {
    const user = await seedUser();
    await startSession(user.id);
    getDb().prepare("DELETE FROM users WHERE id = ?").run(user.id);
    expect(await getCurrentUser()).toBeNull();
  });
});

describe("endSession", () => {
  it("removes the session row and cookie", async () => {
    const user = await seedUser();
    await startSession(user.id);
    await endSession();
    expect(sessionRows()).toHaveLength(0);
    expect(cookieJar.has(SESSION)).toBe(false);
    expect(await getCurrentUser()).toBeNull();
  });

  it("does nothing when nobody is signed in", async () => {
    await expect(endSession()).resolves.toBeUndefined();
    expect(sessionRows()).toHaveLength(0);
  });

  it("only removes the current session", async () => {
    const user = await seedUser();
    await startSession(user.id);
    const other = digest(cookieJar.get(SESSION)!.value);
    cookieJar.clear();
    await startSession(user.id);
    await endSession();
    expect(sessionRows().map((row) => row.token_hash)).toEqual([other]);
  });
});
