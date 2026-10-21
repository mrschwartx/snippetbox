import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applicationMigrations,
  legacyBaseline,
  openApplicationDatabase,
} from "@/bootstrap/database";
import { SqliteUserRepository } from "@/modules/identity/infrastructure/sqlite-user-repository";
import { SqliteSnippetRepository } from "@/modules/snippets/infrastructure/sqlite-snippet-repository";
import {
  migrate,
  openDatabase,
  type SqliteDatabase,
} from "@/shared/infrastructure/sqlite/sqlite-database";

const appliedIds = (database: SqliteDatabase): string[] =>
  database.prepare("SELECT id FROM schema_migrations ORDER BY rowid").pluck().all() as string[];

describe("migrate", () => {
  it("applies every migration once and records its id", () => {
    const database = openApplicationDatabase(":memory:");
    expect(appliedIds(database)).toEqual(applicationMigrations.map((m) => m.id));
  });

  it("is idempotent", () => {
    const database = openApplicationDatabase(":memory:");
    migrate(database, applicationMigrations, legacyBaseline);
    migrate(database, applicationMigrations, legacyBaseline);
    expect(appliedIds(database)).toHaveLength(applicationMigrations.length);
  });

  it("applies only the migrations that are not recorded yet", () => {
    const database = new Database(":memory:");
    migrate(database, [{ id: "test:0001", sql: "CREATE TABLE a (id INTEGER)" }]);
    migrate(database, [
      { id: "test:0001", sql: "CREATE TABLE a (id INTEGER)" },
      { id: "test:0002", sql: "CREATE TABLE b (id INTEGER)" },
    ]);
    expect(appliedIds(database)).toEqual(["test:0001", "test:0002"]);
  });

  it("rolls back a failing migration entirely", () => {
    const database = new Database(":memory:");
    const broken = { id: "test:0001", sql: "CREATE TABLE a (id INTEGER); THIS IS NOT SQL;" };

    expect(() => migrate(database, [broken])).toThrow();
    expect(appliedIds(database)).toEqual([]);
    expect(
      database.prepare("SELECT name FROM sqlite_master WHERE name = 'a'").get(),
    ).toBeUndefined();
  });

  it("creates the identity and snippets tables", () => {
    const database = openApplicationDatabase(":memory:");
    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .pluck()
      .all();
    expect(tables).toEqual(
      expect.arrayContaining(["users", "sessions", "snippets", "schema_migrations"]),
    );
  });
});

describe("opening a database written by the previous version of the app", () => {
  const LEGACY_SCHEMA = `
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created TEXT NOT NULL
    );
    CREATE TABLE snippets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created TEXT NOT NULL,
      expires TEXT NOT NULL
    );
    CREATE INDEX idx_snippets_expires ON snippets (expires);
    CREATE TABLE sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);
    PRAGMA user_version = 1;
  `;

  let directory: string;
  let path: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "snippetbox-legacy-"));
    path = join(directory, "legacy.db");
    const legacy = new Database(path);
    legacy.exec(LEGACY_SCHEMA);
    legacy
      .prepare("INSERT INTO users (name, email, password_hash, created) VALUES (?, ?, ?, ?)")
      .run("Alice", "alice@example.com", "pbkdf2$1$a$b", "2026-10-01T00:00:00.000Z");
    legacy
      .prepare("INSERT INTO snippets (title, content, created, expires) VALUES (?, ?, ?, ?)")
      .run("Old", "kept", "2026-10-01T00:00:00.000Z", "2027-10-01T00:00:00.000Z");
    legacy.close();
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("adopts the legacy schema without recreating tables or losing data", async () => {
    const database = openApplicationDatabase(path);

    expect(appliedIds(database)).toEqual(applicationMigrations.map((m) => m.id));
    expect((await new SqliteUserRepository(database).findByEmail("alice@example.com"))?.name).toBe("Alice");
    expect((await new SqliteSnippetRepository(database).findById(1))?.content).toBe("kept");
    database.close();
  });

  it("can be reopened repeatedly", () => {
    openApplicationDatabase(path).close();
    const database = openApplicationDatabase(path);
    expect(appliedIds(database)).toHaveLength(applicationMigrations.length);
    database.close();
  });

  it("still applies new migrations on top of an adopted legacy database", () => {
    openApplicationDatabase(path).close();
    const database = openDatabase(
      path,
      [...applicationMigrations, { id: "future:0001", sql: "CREATE TABLE future (id INTEGER)" }],
      legacyBaseline,
    );
    expect(appliedIds(database)).toContain("future:0001");
    database.close();
  });
});

describe("openDatabase", () => {
  it("creates missing parent directories for file databases", () => {
    const directory = mkdtempSync(join(tmpdir(), "snippetbox-dir-"));
    const database = openDatabase(join(directory, "nested", "deeper", "app.db"), []);
    expect(database.open).toBe(true);
    database.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("enables foreign keys and WAL for file databases", () => {
    const directory = mkdtempSync(join(tmpdir(), "snippetbox-pragma-"));
    const database = openDatabase(join(directory, "app.db"), []);
    expect(database.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(database.pragma("journal_mode", { simple: true })).toBe("wal");
    database.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
