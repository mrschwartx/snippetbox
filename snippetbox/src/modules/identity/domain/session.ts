export const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000;

export class Session {
  private constructor(
    readonly tokenHash: string,
    readonly userId: number,
    readonly expiresAt: Date,
  ) {}

  static start(tokenHash: string, userId: number, now: Date): Session {
    return new Session(
      tokenHash,
      userId,
      new Date(now.getTime() + SESSION_LIFETIME_MS),
    );
  }

  static restore(tokenHash: string, userId: number, expiresAt: Date): Session {
    return new Session(tokenHash, userId, expiresAt);
  }

  isActiveAt(now: Date): boolean {
    return this.expiresAt.getTime() > now.getTime();
  }
}
