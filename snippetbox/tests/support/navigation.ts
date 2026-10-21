import { vi } from "vitest";

export const navigation = {
  push: vi.fn(),
  replace: vi.fn(),
  pathname: "/",
  params: {} as Record<string, string>,
  reset() {
    this.push.mockClear();
    this.replace.mockClear();
    this.pathname = "/";
    this.params = {};
  },
};
