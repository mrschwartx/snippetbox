import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail } from "@/modules/identity/domain/email";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Alice@Example.COM ")).toBe("alice@example.com");
  });
});

describe("isValidEmail", () => {
  it.each(["a@b.co", "alice+tag@example.com", "o'brien@example.org", "a@b"])(
    "accepts %s",
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    },
  );

  it.each(["a@", "@b.co", "plain", "a b@c.com", "a@-b.com", ""])(
    "rejects %s",
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );
});
