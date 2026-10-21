import { beforeEach, describe, expect, it } from "vitest";
import { openApplicationDatabase } from "@/bootstrap/database";
import { Session } from "@/modules/identity/domain/session";
import { SqliteSessionRepository } from "@/modules/identity/infrastructure/sqlite-session-repository";
import { SqliteUserRepository } from "@/modules/identity/infrastructure/sqlite-user-repository";
import { SqliteSnippetRepository } from "@/modules/snippets/infrastructure/sqlite-snippet-repository";
import type { SqliteDatabase } from "@/shared/infrastructure/sqlite/sqlite-database";
import { sessionRepositoryContract } from "@tests/support/contracts/session-repository.contract";
import { snippetRepositoryContract } from "@tests/support/contracts/snippet-repository.contract";
import { userRepositoryContract } from "@tests/support/contracts/user-repository.contract";

const freshDatabase = () => openApplicationDatabase(":memory:");

const seedUser = (database: SqliteDatabase) =>
  new SqliteUserRepository(database).insert({
    name: "Alice",
    email: "alice@example.com",
    passwordHash: "h",
    created: "2026-10-15T00:00:00.000Z",
  });

userRepositoryContract("SqliteUserRepository", () => new SqliteUserRepository(freshDatabase()));

sessionRepositoryContract("SqliteSessionRepository", async () => {
  const database = freshDatabase();
  const user = await seedUser(database);
  return { repository: new SqliteSessionRepository(database), userId: user.id };
});

snippetRepositoryContract("SqliteSnippetRepository", () => new SqliteSnippetRepository(freshDatabase()));

describe("SQLite specific guarantees", () => {
  let database: SqliteDatabase;

  beforeEach(() => {
    database = freshDatabase();
  });

  it("never reuses snippet ids after a deletion", async () => {
    const repository = new SqliteSnippetRepository(database);
    const snippet = {
      title: "t",
      content: "c",
      created: new Date("2026-10-15T00:00:00.000Z"),
      expires: new Date("2026-10-16T00:00:00.000Z"),
    };
    await repository.insert(snippet);
    await repository.insert(snippet);

    database.prepare("DELETE FROM snippets WHERE id = 2").run();

    expect((await repository.insert(snippet)).id).toBe(3);
    expect(await repository.findById(2)).toBeNull();
  });

  it("enforces foreign keys so a session cannot point at a missing user", async () => {
    const sessions = new SqliteSessionRepository(database);
    await expect(
      sessions.save(Session.restore("hash", 999, new Date("2026-10-16T00:00:00.000Z"))),
    ).rejects.toThrow(/FOREIGN KEY/);
  });

  it("removes the sessions of a user when that user is deleted", async () => {
    const user = await seedUser(database);
    const sessions = new SqliteSessionRepository(database);
    await sessions.save(Session.restore("hash", user.id, new Date("2026-10-16T00:00:00.000Z")));

    database.prepare("DELETE FROM users WHERE id = ?").run(user.id);

    expect(await sessions.findByTokenHash("hash")).toBeNull();
  });

  it("propagates storage errors that are not duplicate emails", async () => {
    const users = new SqliteUserRepository(database);
    database.exec("DROP TABLE sessions");
    database.exec("DROP TABLE users");

    await expect(
      users.insert({ name: "A", email: "a@b.co", passwordHash: "h", created: "x" }),
    ).rejects.toThrow(/no such table/);
  });
});
