import { ValidationError } from "@/shared/kernel/errors";
import type { Clock } from "@/shared/kernel/clock";
import { normalizeEmail } from "../domain/email";
import { DuplicateEmailError } from "../domain/errors";
import { validateSignup, type SignupInput } from "../domain/registration";
import type { UserRepository } from "../domain/user-repository";
import type { Notifier, PasswordHasher } from "./ports";

export class SignupUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
  ) {}

  async execute(input: SignupInput): Promise<void> {
    validateSignup(input).assertValid();

    const passwordHash = await this.hasher.hash(input.password);

    try {
      await this.users.insert({
        name: input.name.trim(),
        email: normalizeEmail(input.email),
        passwordHash,
        created: this.clock.now().toISOString(),
      });
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        throw new ValidationError({ email: "Email address is already in use" });
      }
      throw error;
    }

    await this.notifier.notify("Your signup was successful. Please log in.");
  }
}
