import type {
  CookieJar,
  CookieOptions,
} from "@/shared/infrastructure/http/cookie-jar";
import type { FlashStore } from "../application/ports";

export const FLASH_COOKIE = "snippetbox_flash";
const FLASH_MAX_AGE_SECONDS = 60;

export class CookieFlashStore implements FlashStore {
  constructor(
    private readonly cookies: CookieJar,
    private readonly options: CookieOptions,
  ) {}

  async push(message: string): Promise<void> {
    await this.cookies.set(FLASH_COOKIE, message, {
      ...this.options,
      maxAge: FLASH_MAX_AGE_SECONDS,
    });
  }

  async pop(): Promise<string | null> {
    const message = await this.cookies.get(FLASH_COOKIE);
    if (message === undefined) return null;

    await this.cookies.delete(FLASH_COOKIE);
    return message;
  }
}
