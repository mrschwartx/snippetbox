import { describe, expect, it } from "vitest";
import { ValidationError } from "@/shared/kernel/errors";
import {
  Validator,
  matches,
  maxChars,
  minChars,
  notBlank,
  permittedValue,
} from "@/shared/kernel/validation";

describe("Validator", () => {
  it("is valid when no check failed", () => {
    const validator = new Validator();
    validator.check(true, "title", "bad");
    expect(validator.valid).toBe(true);
  });

  it("keeps only the first error for a field", () => {
    const validator = new Validator();
    validator.check(false, "title", "first");
    validator.check(false, "title", "second");
    expect(validator.fieldErrors).toEqual({ title: "first" });
    expect(validator.valid).toBe(false);
  });

  it("collects errors for different fields independently", () => {
    const validator = new Validator();
    validator.check(false, "title", "a");
    validator.check(false, "content", "b");
    expect(validator.fieldErrors).toEqual({ title: "a", content: "b" });
  });

  it("does not throw when asserting a valid state", () => {
    expect(() => new Validator().assertValid()).not.toThrow();
  });

  it("throws a ValidationError carrying the field errors when invalid", () => {
    const validator = new Validator();
    validator.check(false, "title", "bad");
    try {
      validator.assertValid();
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).fieldErrors).toEqual({ title: "bad" });
    }
  });
});

describe("validation rules", () => {
  it("notBlank rejects whitespace only", () => {
    expect(notBlank("   ")).toBe(false);
    expect(notBlank("")).toBe(false);
    expect(notBlank(" a ")).toBe(true);
  });

  it.each([
    ["日本語", 3, true],
    ["日本語", 2, false],
    ["😀😀", 2, true],
    ["", 0, true],
  ])("maxChars counts characters rather than bytes (%s, %i)", (value, limit, expected) => {
    expect(maxChars(value, limit)).toBe(expected);
  });

  it.each([
    ["日本語", 3, true],
    ["日本語", 4, false],
    ["😀", 1, true],
  ])("minChars counts characters rather than bytes (%s, %i)", (value, limit, expected) => {
    expect(minChars(value, limit)).toBe(expected);
  });

  it("permittedValue checks membership", () => {
    expect(permittedValue(7, [1, 7, 365])).toBe(true);
    expect(permittedValue(2, [1, 7, 365])).toBe(false);
  });

  it("matches tests a pattern", () => {
    expect(matches("abc", /^a/)).toBe(true);
    expect(matches("xbc", /^a/)).toBe(false);
  });
});
