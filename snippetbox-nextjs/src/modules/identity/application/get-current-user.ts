import type { UserProfile } from "../domain/user";
import type { UserRepository } from "../domain/user-repository";
import type { SessionManager } from "./session-manager";

export class GetCurrentUser {
  constructor(
    private readonly sessions: SessionManager,
    private readonly users: UserRepository,
  ) {}

  async execute(): Promise<UserProfile | null> {
    const session = await this.sessions.resolve();
    if (!session) return null;

    const user = await this.users.findById(session.userId);
    if (!user) {
      await this.sessions.end();
      return null;
    }

    return user.toProfile();
  }
}
