import { afterEach, beforeEach, vi } from "vitest";
import { cookieJar } from "../helpers/cookie-jar";
import { cleanupDatabases, freshDatabase } from "../helpers/db";

vi.mock("next/headers", async () => {
  const { cookieJar: jar } = await import("../helpers/cookie-jar");
  return { cookies: async () => jar };
});

vi.mock("next/navigation", async () => {
  const { NotFoundSignal, RedirectSignal } = await import("../helpers/navigation");
  return {
    redirect: (url: string) => {
      throw new RedirectSignal(url);
    },
    notFound: () => {
      throw new NotFoundSignal();
    },
  };
});

beforeEach(() => {
  cookieJar.clear();
  freshDatabase();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  cleanupDatabases();
});
