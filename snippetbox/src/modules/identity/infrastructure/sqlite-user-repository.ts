import type { SqliteDatabase } from "@/shared/infrastructure/sqlite/sqlite-database";
import { DuplicateEmailError } from "../domain/errors";
import { User, type NewUser } from "../domain/user";
import type { UserRepository } from "../domain/user-repository";

interface UserRow {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  created: string;
}

const SELECT_USER =
  "SELECT id, name, email, password_hash AS passwordHash, created FROM users";

const toUser = (row: UserRow): User =>
  new User(row.id, row.name, row.email, row.passwordHash, row.created);

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Error &&
  "code" in error &&
  error.code === "SQLITE_CONSTRAINT_UNIQUE";

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async insert(user: NewUser): Promise<User> {
    try {
      const result = this.database
        .prepare(
          "INSERT INTO users (name, email, password_hash, created) VALUES (?, ?, ?, ?)",
        )
        .run(user.name, user.email, user.passwordHash, user.created);

      return new User(
        Number(result.lastInsertRowid),
        user.name,
        user.email,
        user.passwordHash,
        user.created,
      );
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateEmailError();
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = this.database
      .prepare(`${SELECT_USER} WHERE email = ?`)
      .get(email) as UserRow | undefined;

    return row ? toUser(row) : null;
  }

  async findById(id: number): Promise<User | null> {
    const row = this.database
      .prepare(`${SELECT_USER} WHERE id = ?`)
      .get(id) as UserRow | undefined;

    return row ? toUser(row) : null;
  }
}
