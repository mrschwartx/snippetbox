import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

vi.mock("next/navigation", async () => {
  const { navigation } = await import("./navigation");
  return {
    useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
    usePathname: () => navigation.pathname,
    useParams: () => navigation.params,
  };
});

beforeEach(async () => {
  const { navigation } = await import("./navigation");
  navigation.reset();
});

afterEach(() => {
  cleanup();
});
