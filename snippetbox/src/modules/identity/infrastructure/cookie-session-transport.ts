import type {
  CookieJar,
  CookieOptions,
} from "@/shared/infrastructure/http/cookie-jar";
import type { SessionCookie } from "../application/ports";

export const SESSION_COOKIE = "snippetbox_session";

export class CookieSessionTransport implements SessionCookie {
  constructor(
    private readonly cookies: CookieJar,
    private readonly options: CookieOptions,
  ) {}

  read(): Promise<string | undefined> {
    return this.cookies.get(SESSION_COOKIE);
  }

  write(token: string, expiresAt: Date): Promise<void> {
    return this.cookies.set(SESSION_COOKIE, token, {
      ...this.options,
      expires: expiresAt,
    });
  }

  clear(): Promise<void> {
    return this.cookies.delete(SESSION_COOKIE);
  }
}
