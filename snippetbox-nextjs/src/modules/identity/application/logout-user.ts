import type { Notifier } from "./ports";
import type { SessionManager } from "./session-manager";

export class LogoutUser {
  constructor(
    private readonly sessions: SessionManager,
    private readonly notifier: Notifier,
  ) {}

  async execute(): Promise<void> {
    await this.sessions.end();
    await this.notifier.notify("You've been logged out successfully!");
  }
}
