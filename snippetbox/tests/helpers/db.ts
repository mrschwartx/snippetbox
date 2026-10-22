import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Store = typeof globalThis & { snippetboxDb?: { close(): void } };

const directories: string[] = [];

export function closeDatabase() {
  const store = globalThis as Store;
  if (store.snippetboxDb) {
    store.snippetboxDb.close();
    delete store.snippetboxDb;
  }
}

export function freshDatabase() {
  closeDatabase();
  const directory = mkdtempSync(join(tmpdir(), "snippetbox-test-"));
  directories.push(directory);
  process.env.DATABASE_PATH = join(directory, "test.db");
  return process.env.DATABASE_PATH;
}

export function cleanupDatabases() {
  closeDatabase();
  while (directories.length > 0) {
    rmSync(directories.pop() as string, { recursive: true, force: true });
  }
}
