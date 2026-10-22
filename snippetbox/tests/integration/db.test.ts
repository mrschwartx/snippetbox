import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { closeDatabase } from "../helpers/db";

const names = (type: string) =>
  (
    getDb()
      .prepare("SELECT name FROM sqlite_master WHERE type = ? AND name NOT LIKE 'sqlite_%'")
      .all(type) as { name: string }[]
  )
    .map((row) => row.name)
    .sort();

describe("database", () => {
  it("creates the schema on first use", () => {
    expect(names("table")).toEqual(["sessions", "snippets", "users"]);
  });

  it("creates the indexes", () => {
    expect(names("index")).toEqual(expect.arrayContaining(["idx_sessions_expires_at", "idx_snippets_expires"]));
  });

  it("returns the same connection on every call", () => {
    expect(getDb()).toBe(getDb());
  });

  it("enables WAL, foreign keys and a busy timeout", () => {
    const db = getDb();
    expect(db.pragma("journal_mode", { simple: true })).toBe("wal");
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(db.pragma("busy_timeout", { simple: true })).toBe(5000);
  });

  it("creates missing parent directories for the database file", () => {
    closeDatabase();
    const base = process.env.DATABASE_PATH as string;
    const nested = join(base, "..", "a", "b", "nested.db");
    process.env.DATABASE_PATH = nested;
    getDb();
    expect(existsSync(nested)).toBe(true);
  });

  it("is idempotent when reopening an existing database", () => {
    const path = process.env.DATABASE_PATH as string;
    getDb()
      .prepare("INSERT INTO snippets (title, content, created, expires) VALUES ('t','c','a','b')")
      .run();
    closeDatabase();
    process.env.DATABASE_PATH = path;
    const count = getDb().prepare("SELECT COUNT(*) AS n FROM snippets").get() as { n: number };
    expect(count.n).toBe(1);
  });

  it("rejects duplicate emails regardless of case", () => {
    const insert = getDb().prepare("INSERT INTO users (name, email, password_hash, created) VALUES (?, ?, 'h', 'now')");
    insert.run("A", "Person@Example.com");
    expect(() => insert.run("B", "person@example.com")).toThrow(/UNIQUE/);
  });

  it("rejects sessions that reference a missing user", () => {
    expect(() =>
      getDb().prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ('x', 999, 'later')").run(),
    ).toThrow(/FOREIGN KEY/);
  });

  it("cascades session deletion when a user is removed", () => {
    const db = getDb();
    const { lastInsertRowid } = db
      .prepare("INSERT INTO users (name, email, password_hash, created) VALUES ('A','a@b.co','h','now')")
      .run();
    db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ('x', ?, 'later')").run(lastInsertRowid);
    db.prepare("DELETE FROM users WHERE id = ?").run(lastInsertRowid);
    expect((db.prepare("SELECT COUNT(*) AS n FROM sessions").get() as { n: number }).n).toBe(0);
  });

  it("requires non-null columns", () => {
    expect(() => getDb().prepare("INSERT INTO snippets (title) VALUES ('only title')").run()).toThrow(/NOT NULL/);
  });
});
