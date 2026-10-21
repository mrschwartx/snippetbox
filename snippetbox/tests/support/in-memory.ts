import type {
  Notifier as IdentityNotifier,
  PasswordHasher,
  SessionCookie,
  SessionTokens,
} from "@/modules/identity/application/ports";
import type { FlashStore } from "@/modules/flash/application/ports";
import { DuplicateEmailError } from "@/modules/identity/domain/errors";
import type { Session } from "@/modules/identity/domain/session";
import type { SessionRepository } from "@/modules/identity/domain/session-repository";
import { User, type NewUser } from "@/modules/identity/domain/user";
import type { UserRepository } from "@/modules/identity/domain/user-repository";
import type { Authenticator } from "@/modules/snippets/application/ports";
import { Snippet, type NewSnippet } from "@/modules/snippets/domain/snippet";
import type { SnippetRepository } from "@/modules/snippets/domain/snippet-repository";
import type { Clock } from "@/shared/kernel/clock";

export class FixedClock implements Clock {
  constructor(private current: Date = new Date("2026-10-15T08:00:00.000Z")) {}

  now(): Date {
    return new Date(this.current.getTime());
  }

  advanceHours(hours: number): void {
    this.current = new Date(this.current.getTime() + hours * 60 * 60 * 1000);
  }

  advanceDays(days: number): void {
    this.advanceHours(days * 24);
  }
}

export class FakePasswordHasher implements PasswordHasher {
  readonly hashed: string[] = [];
  readonly verified: string[] = [];

  async hash(plain: string): Promise<string> {
    this.hashed.push(plain);
    return `hashed:${plain}`;
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    this.verified.push(plain);
    return hash === `hashed:${plain}`;
  }
}

export class SequentialSessionTokens implements SessionTokens {
  private counter = 0;

  generate(): string {
    this.counter += 1;
    return `token-${this.counter}`;
  }

  digest(token: string): string {
    return `digest(${token})`;
  }
}

export class InMemorySessionCookie implements SessionCookie {
  token: string | undefined;
  expiresAt: Date | undefined;

  async read(): Promise<string | undefined> {
    return this.token;
  }

  async write(token: string, expiresAt: Date): Promise<void> {
    this.token = token;
    this.expiresAt = expiresAt;
  }

  async clear(): Promise<void> {
    this.token = undefined;
    this.expiresAt = undefined;
  }
}

export class RecordingNotifier implements IdentityNotifier {
  readonly messages: string[] = [];

  async notify(message: string): Promise<void> {
    this.messages.push(message);
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users: User[] = [];

  async insert(user: NewUser): Promise<User> {
    const duplicate = this.users.some(
      (existing) => existing.email.toLowerCase() === user.email.toLowerCase(),
    );
    if (duplicate) throw new DuplicateEmailError();

    const stored = new User(
      this.users.length + 1,
      user.name,
      user.email,
      user.passwordHash,
      user.created,
    );
    this.users.push(stored);
    return stored;
  }

  async findByEmail(email: string): Promise<User | null> {
    return (
      this.users.find(
        (user) => user.email.toLowerCase() === email.toLowerCase(),
      ) ?? null
    );
  }

  async findById(id: number): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  get count(): number {
    return this.users.length;
  }

  remove(id: number): void {
    const index = this.users.findIndex((user) => user.id === id);
    if (index >= 0) this.users.splice(index, 1);
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, Session>();

  async save(session: Session): Promise<void> {
    this.sessions.set(session.tokenHash, session);
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    return this.sessions.get(tokenHash) ?? null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
  }

  async deleteExpired(now: Date): Promise<void> {
    for (const [hash, session] of this.sessions) {
      if (!session.isActiveAt(now)) this.sessions.delete(hash);
    }
  }

  get count(): number {
    return this.sessions.size;
  }
}

export class InMemorySnippetRepository implements SnippetRepository {
  private readonly snippets: Snippet[] = [];
  private lastId = 0;

  async insert(snippet: NewSnippet): Promise<Snippet> {
    this.lastId += 1;
    const stored = Snippet.restore({ id: this.lastId, ...snippet });
    this.snippets.push(stored);
    return stored;
  }

  async findById(id: number): Promise<Snippet | null> {
    return this.snippets.find((snippet) => snippet.id === id) ?? null;
  }

  async findLatestActive(now: Date, limit: number): Promise<Snippet[]> {
    return this.snippets
      .filter((snippet) => !snippet.isExpiredAt(now))
      .sort((a, b) => b.id - a.id)
      .slice(0, limit);
  }

  get count(): number {
    return this.snippets.length;
  }
}

export class StubAuthenticator implements Authenticator {
  constructor(public authenticated = false) {}

  async isAuthenticated(): Promise<boolean> {
    return this.authenticated;
  }
}

export class InMemoryFlashStore implements FlashStore {
  private message: string | null = null;

  async push(message: string): Promise<void> {
    this.message = message;
  }

  async pop(): Promise<string | null> {
    const current = this.message;
    this.message = null;
    return current;
  }
}
