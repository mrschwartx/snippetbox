import type { SqliteDatabase } from "@/shared/infrastructure/sqlite/sqlite-database";
import { Session } from "../domain/session";
import type { SessionRepository } from "../domain/session-repository";

interface SessionRow {
  tokenHash: string;
  userId: number;
  expiresAt: string;
}

export class SqliteSessionRepository implements SessionRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async save(session: Session): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)
         ON CONFLICT (token_hash) DO UPDATE SET
           user_id = excluded.user_id,
           expires_at = excluded.expires_at`,
      )
      .run(session.tokenHash, session.userId, session.expiresAt.toISOString());
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const row = this.database
      .prepare(
        `SELECT token_hash AS tokenHash, user_id AS userId, expires_at AS expiresAt
         FROM sessions WHERE token_hash = ?`,
      )
      .get(tokenHash) as SessionRow | undefined;

    return row
      ? Session.restore(row.tokenHash, row.userId, new Date(row.expiresAt))
      : null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    this.database
      .prepare("DELETE FROM sessions WHERE token_hash = ?")
      .run(tokenHash);
  }

  async deleteExpired(now: Date): Promise<void> {
    this.database
      .prepare("DELETE FROM sessions WHERE expires_at <= ?")
      .run(now.toISOString());
  }
}
