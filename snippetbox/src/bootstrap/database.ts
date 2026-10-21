import { readConfig } from "@/shared/infrastructure/config";
import {
  openDatabase,
  type Migration,
  type SqliteDatabase,
} from "@/shared/infrastructure/sqlite/sqlite-database";
import {
  IDENTITY_BASELINE_MIGRATION,
  identityMigrations,
} from "@/modules/identity";
import {
  SNIPPETS_BASELINE_MIGRATION,
  snippetsMigrations,
} from "@/modules/snippets";

export const applicationMigrations: readonly Migration[] = [
  ...identityMigrations,
  ...snippetsMigrations,
];

export const legacyBaseline: readonly string[] = [
  IDENTITY_BASELINE_MIGRATION,
  SNIPPETS_BASELINE_MIGRATION,
];

export const openApplicationDatabase = (path: string): SqliteDatabase =>
  openDatabase(path, applicationMigrations, legacyBaseline);

const globalStore = globalThis as typeof globalThis & {
  snippetboxDatabase?: SqliteDatabase;
};

export const getDatabase = (): SqliteDatabase => {
  globalStore.snippetboxDatabase ??= openApplicationDatabase(
    readConfig(process.env).databasePath,
  );
  return globalStore.snippetboxDatabase;
};

export const closeDatabase = (): void => {
  globalStore.snippetboxDatabase?.close();
  globalStore.snippetboxDatabase = undefined;
};
