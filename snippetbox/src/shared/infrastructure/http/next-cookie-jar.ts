import { cookies } from "next/headers";
import type { CookieJar, CookieOptions } from "./cookie-jar";

export class NextCookieJar implements CookieJar {
  async get(name: string): Promise<string | undefined> {
    return (await cookies()).get(name)?.value;
  }

  async set(
    name: string,
    value: string,
    options: CookieOptions = {},
  ): Promise<void> {
    (await cookies()).set(name, value, options);
  }

  async delete(name: string): Promise<void> {
    (await cookies()).delete(name);
  }
}
