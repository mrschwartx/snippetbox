import type {
  CookieJar,
  CookieOptions,
} from "@/shared/infrastructure/http/cookie-jar";
import type { SqliteDatabase } from "@/shared/infrastructure/sqlite/sqlite-database";
import type { Clock } from "@/shared/kernel/clock";
import { GetCurrentUser } from "./application/get-current-user";
import { LoginUser } from "./application/login-user";
import { LogoutUser } from "./application/logout-user";
import type { Notifier, PasswordHasher } from "./application/ports";
import { SessionManager } from "./application/session-manager";
import { SignupUser } from "./application/signup-user";
import { CookieSessionTransport } from "./infrastructure/cookie-session-transport";
import { CryptoSessionTokens } from "./infrastructure/crypto-session-tokens";
import { SqliteSessionRepository } from "./infrastructure/sqlite-session-repository";
import { SqliteUserRepository } from "./infrastructure/sqlite-user-repository";
import { WebCryptoPasswordHasher } from "./infrastructure/web-crypto-password-hasher";

export interface IdentityDependencies {
  database: SqliteDatabase;
  cookies: CookieJar;
  cookieOptions: CookieOptions;
  clock: Clock;
  notifier: Notifier;
  hasher?: PasswordHasher;
}

export interface IdentityModule {
  signupUser: SignupUser;
  loginUser: LoginUser;
  logoutUser: LogoutUser;
  getCurrentUser: GetCurrentUser;
}

export const createIdentityModule = ({
  database,
  cookies,
  cookieOptions,
  clock,
  notifier,
  hasher = new WebCryptoPasswordHasher(),
}: IdentityDependencies): IdentityModule => {
  const users = new SqliteUserRepository(database);
  const sessions = new SessionManager(
    new SqliteSessionRepository(database),
    new CryptoSessionTokens(),
    new CookieSessionTransport(cookies, cookieOptions),
    clock,
  );

  return {
    signupUser: new SignupUser(users, hasher, notifier, clock),
    loginUser: new LoginUser(users, hasher, sessions),
    logoutUser: new LogoutUser(sessions, notifier),
    getCurrentUser: new GetCurrentUser(sessions, users),
  };
};
