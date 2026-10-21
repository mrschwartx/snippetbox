import { ValidationError } from "@/shared/kernel/errors";
import { validateLogin, type LoginInput } from "../domain/credentials";
import { normalizeEmail } from "../domain/email";
import type { UserRepository } from "../domain/user-repository";
import type { PasswordHasher } from "./ports";
import type { SessionManager } from "./session-manager";

const INVALID_CREDENTIALS_MESSAGE = "Email or password is incorrect";
const TIMING_DECOY_PASSWORD = "snippetbox-timing-decoy";

export class LoginUser {
  private decoyHash: Promise<string> | undefined;

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionManager,
  ) {}

  async execute(input: LoginInput): Promise<number> {
    validateLogin(input).assertValid();

    const user = await this.users.findByEmail(normalizeEmail(input.email));
    const hash = user ? user.passwordHash : await this.getDecoyHash();
    const passwordMatches = await this.hasher.verify(input.password, hash);

    if (!user || !passwordMatches) {
      throw new ValidationError({}, [INVALID_CREDENTIALS_MESSAGE]);
    }

    await this.sessions.start(user.id);
    return user.id;
  }

  private getDecoyHash(): Promise<string> {
    this.decoyHash ??= this.hasher.hash(TIMING_DECOY_PASSWORD);
    return this.decoyHash;
  }
}
