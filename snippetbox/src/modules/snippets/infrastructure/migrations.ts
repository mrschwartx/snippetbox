import type { Migration } from "@/shared/infrastructure/sqlite/sqlite-database";

export const SNIPPETS_BASELINE_MIGRATION = "snippets:0001-create-snippets";

export const snippetsMigrations: readonly Migration[] = [
  {
    id: SNIPPETS_BASELINE_MIGRATION,
    sql: `
      CREATE TABLE snippets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created TEXT NOT NULL,
        expires TEXT NOT NULL
      );

      CREATE INDEX idx_snippets_expires ON snippets (expires);
    `,
  },
];
