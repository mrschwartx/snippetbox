import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type SqliteDatabase = Database.Database;

export interface Migration {
  id: string;
  sql: string;
}

const MIGRATIONS_TABLE = "schema_migrations";

const adoptLegacyVersion = (
  database: SqliteDatabase,
  legacyBaseline: readonly string[],
): void => {
  const legacyVersion = database.pragma("user_version", {
    simple: true,
  }) as number;
  if (legacyVersion === 0 || legacyBaseline.length === 0) return;

  const recorded = database
    .prepare(`SELECT COUNT(*) FROM ${MIGRATIONS_TABLE}`)
    .pluck()
    .get() as number;
  if (recorded > 0) return;

  const record = database.prepare(
    `INSERT INTO ${MIGRATIONS_TABLE} (id, applied_at) VALUES (?, ?)`,
  );
  const appliedAt = new Date().toISOString();
  database.transaction(() => {
    for (const id of legacyBaseline) record.run(id, appliedAt);
  })();
};

export const migrate = (
  database: SqliteDatabase,
  migrations: readonly Migration[],
  legacyBaseline: readonly string[] = [],
): void => {
  database.exec(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`,
  );
  adoptLegacyVersion(database, legacyBaseline);

  const applied = new Set(
    database.prepare(`SELECT id FROM ${MIGRATIONS_TABLE}`).pluck().all() as string[],
  );
  const record = database.prepare(
    `INSERT INTO ${MIGRATIONS_TABLE} (id, applied_at) VALUES (?, ?)`,
  );

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    database.transaction(() => {
      database.exec(migration.sql);
      record.run(migration.id, new Date().toISOString());
    })();
  }
};

export const openDatabase = (
  path: string,
  migrations: readonly Migration[],
  legacyBaseline: readonly string[] = [],
): SqliteDatabase => {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

  const database = new Database(path);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  migrate(database, migrations, legacyBaseline);
  return database;
};
