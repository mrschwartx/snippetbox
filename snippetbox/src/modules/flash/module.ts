import type {
  CookieJar,
  CookieOptions,
} from "@/shared/infrastructure/http/cookie-jar";
import { PopFlash } from "./application/pop-flash";
import { PushFlash } from "./application/push-flash";
import { CookieFlashStore } from "./infrastructure/cookie-flash-store";

export interface FlashDependencies {
  cookies: CookieJar;
  cookieOptions: CookieOptions;
}

export interface FlashModule {
  pushFlash: PushFlash;
  popFlash: PopFlash;
}

export const createFlashModule = ({
  cookies,
  cookieOptions,
}: FlashDependencies): FlashModule => {
  const store = new CookieFlashStore(cookies, cookieOptions);

  return {
    pushFlash: new PushFlash(store),
    popFlash: new PopFlash(store),
  };
};
