import type {
  CookieJar,
  CookieOptions,
} from "@/shared/infrastructure/http/cookie-jar";

interface StoredCookie {
  value: string;
  options: CookieOptions;
}

export class InMemoryCookieJar implements CookieJar {
  private readonly values = new Map<string, StoredCookie>();

  async get(name: string): Promise<string | undefined> {
    return this.values.get(name)?.value;
  }

  async set(
    name: string,
    value: string,
    options: CookieOptions = {},
  ): Promise<void> {
    this.values.set(name, { value, options });
  }

  async delete(name: string): Promise<void> {
    this.values.delete(name);
  }

  optionsOf(name: string): CookieOptions | undefined {
    return this.values.get(name)?.options;
  }

  has(name: string): boolean {
    return this.values.has(name);
  }
}
