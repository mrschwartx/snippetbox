import type { Migration } from "@/shared/infrastructure/sqlite/sqlite-database";

export const IDENTITY_BASELINE_MIGRATION = "identity:0001-create-users-and-sessions";

export const identityMigrations: readonly Migration[] = [
  {
    id: IDENTITY_BASELINE_MIGRATION,
    sql: `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        created TEXT NOT NULL
      );

      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL
      );

      CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);
    `,
  },
];
