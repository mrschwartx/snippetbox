import { createServerModules, type ServerModules } from "@/bootstrap/server-modules";
import { openApplicationDatabase } from "@/bootstrap/database";
import type { SqliteDatabase } from "@/shared/infrastructure/sqlite/sqlite-database";
import { FakePasswordHasher, FixedClock } from "./in-memory";
import { InMemoryCookieJar } from "./in-memory-cookie-jar";

export interface TestWorld {
  modules: ServerModules;
  database: SqliteDatabase;
  cookies: InMemoryCookieJar;
  clock: FixedClock;
  hasher: FakePasswordHasher;
  dispose: () => void;
}

export const createTestWorld = (): TestWorld => {
  const database = openApplicationDatabase(":memory:");
  const cookies = new InMemoryCookieJar();
  const clock = new FixedClock();
  const hasher = new FakePasswordHasher();
  const modules = createServerModules({ database, cookies, clock, hasher });
  return { modules, database, cookies, clock, hasher, dispose: () => database.close() };
};

export const registerAndLogin = async (
  world: TestWorld,
  email = "alice@example.com",
  password = "correct-horse",
): Promise<void> => {
  await world.modules.identity.signupUser.execute({ name: "Alice", email, password });
  await world.modules.identity.loginUser.execute({ email, password });
  await world.modules.flash.popFlash.execute();
};
