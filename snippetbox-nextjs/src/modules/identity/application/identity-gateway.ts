import type { LoginInput } from "../domain/credentials";
import type { SignupInput } from "../domain/registration";
import type { UserProfile } from "../domain/user";

export interface IdentityGateway {
  currentUser(): Promise<UserProfile | null>;
  signup(input: SignupInput): Promise<void>;
  login(input: LoginInput): Promise<void>;
  logout(): Promise<void>;
}
