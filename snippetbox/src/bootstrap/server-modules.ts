import { createFlashModule, type FlashModule } from "@/modules/flash";
import {
  createIdentityModule,
  type IdentityModule,
  type PasswordHasher,
} from "@/modules/identity";
import { createSnippetsModule, type SnippetsModule } from "@/modules/snippets";
import {
  baseCookieOptions,
  type CookieJar,
} from "@/shared/infrastructure/http/cookie-jar";
import type { SqliteDatabase } from "@/shared/infrastructure/sqlite/sqlite-database";
import { SystemClock } from "@/shared/infrastructure/time/system-clock";
import type { Clock } from "@/shared/kernel/clock";

export interface ServerModulesOptions {
  database: SqliteDatabase;
  cookies: CookieJar;
  secureCookies?: boolean;
  clock?: Clock;
  hasher?: PasswordHasher;
}

export interface ServerModules {
  identity: IdentityModule;
  snippets: SnippetsModule;
  flash: FlashModule;
}

export const createServerModules = ({
  database,
  cookies,
  secureCookies = false,
  clock = new SystemClock(),
  hasher,
}: ServerModulesOptions): ServerModules => {
  const cookieOptions = baseCookieOptions(secureCookies);

  const flash = createFlashModule({ cookies, cookieOptions });
  const notifier = { notify: (message: string) => flash.pushFlash.execute(message) };

  const identity = createIdentityModule({
    database,
    cookies,
    cookieOptions,
    clock,
    notifier,
    hasher,
  });

  const authenticator = {
    isAuthenticated: async () =>
      (await identity.getCurrentUser.execute()) !== null,
  };

  const snippets = createSnippetsModule({
    database,
    clock,
    authenticator,
    notifier,
  });

  return { identity, snippets, flash };
};
