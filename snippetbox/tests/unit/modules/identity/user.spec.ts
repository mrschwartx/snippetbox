import { describe, expect, it } from "vitest";
import { DomainError } from "@/shared/kernel/domain-error";
import { DuplicateEmailError } from "@/modules/identity/domain/errors";
import { User } from "@/modules/identity/domain/user";

describe("User", () => {
  const user = new User(7, "Alice", "alice@example.com", "secret-hash", "2026-10-15T00:00:00.000Z");

  it("exposes a public profile without the password hash", () => {
    expect(user.toProfile()).toEqual({
      id: 7,
      name: "Alice",
      email: "alice@example.com",
      created: "2026-10-15T00:00:00.000Z",
    });
    expect(Object.keys(user.toProfile())).not.toContain("passwordHash");
  });
});

describe("DuplicateEmailError", () => {
  it("is a conflict domain error", () => {
    const error = new DuplicateEmailError();
    expect(error).toBeInstanceOf(DomainError);
    expect(error.kind).toBe("conflict");
    expect(error.code).toBe("DUPLICATE_EMAIL");
  });
});
