import { cookies } from "next/headers";
import { cookieOptions } from "./config";

export const FLASH_COOKIE = "snippetbox_flash";

export async function setFlash(message: string) {
  (await cookies()).set(FLASH_COOKIE, message, {
    ...cookieOptions(),
    httpOnly: false,
    maxAge: 60,
  });
}

export async function getFlash() {
  return (await cookies()).get(FLASH_COOKIE)?.value ?? null;
}
