import type { Clock } from "@/shared/kernel/clock";
import { Session } from "../domain/session";
import type { SessionRepository } from "../domain/session-repository";
import type { SessionCookie, SessionTokens } from "./ports";

export class SessionManager {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: SessionTokens,
    private readonly cookie: SessionCookie,
    private readonly clock: Clock,
  ) {}

  async start(userId: number): Promise<void> {
    const previous = await this.cookie.read();
    if (previous) {
      await this.sessions.deleteByTokenHash(this.tokens.digest(previous));
    }

    const now = this.clock.now();
    await this.sessions.deleteExpired(now);

    const token = this.tokens.generate();
    const session = Session.start(this.tokens.digest(token), userId, now);
    await this.sessions.save(session);
    await this.cookie.write(token, session.expiresAt);
  }

  async resolve(): Promise<Session | null> {
    const token = await this.cookie.read();
    if (!token) return null;

    const session = await this.sessions.findByTokenHash(
      this.tokens.digest(token),
    );
    if (!session) return null;

    if (!session.isActiveAt(this.clock.now())) {
      await this.end();
      return null;
    }

    return session;
  }

  async end(): Promise<void> {
    const token = await this.cookie.read();
    if (!token) return;

    await this.sessions.deleteByTokenHash(this.tokens.digest(token));
    await this.cookie.clear();
  }
}
