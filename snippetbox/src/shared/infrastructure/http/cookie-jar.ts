export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  expires?: Date;
  maxAge?: number;
}

export interface CookieJar {
  get(name: string): Promise<string | undefined>;
  set(name: string, value: string, options?: CookieOptions): Promise<void>;
  delete(name: string): Promise<void>;
}

export const baseCookieOptions = (secure: boolean): CookieOptions => ({
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure,
});
