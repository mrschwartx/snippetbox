import { describe, expect, it } from "vitest";
import { validateSignup } from "@/modules/identity/domain/registration";

const valid = { name: "Alice", email: "alice@example.com", password: "12345678" };

describe("validateSignup", () => {
  it("accepts a valid signup", () => {
    expect(validateSignup(valid).valid).toBe(true);
  });

  it("requires every field", () => {
    expect(validateSignup({ name: "", email: "", password: "" }).fieldErrors).toEqual({
      name: "This field cannot be blank",
      email: "This field cannot be blank",
      password: "This field cannot be blank",
    });
  });

  it("treats whitespace as blank", () => {
    expect(validateSignup({ ...valid, name: "   " }).fieldErrors.name).toBe(
      "This field cannot be blank",
    );
  });

  it("rejects a malformed email", () => {
    expect(validateSignup({ ...valid, email: "nope" }).fieldErrors.email).toBe(
      "This field must be a valid email address",
    );
  });

  it("rejects an email with surrounding whitespace instead of silently fixing it", () => {
    expect(validateSignup({ ...valid, email: " alice@example.com " }).fieldErrors.email).toBe(
      "This field must be a valid email address",
    );
  });

  it("rejects a password shorter than eight characters", () => {
    expect(validateSignup({ ...valid, password: "1234567" }).fieldErrors.password).toBe(
      "This field must be at least 8 characters long",
    );
  });

  it("accepts a password of exactly eight characters", () => {
    expect(validateSignup({ ...valid, password: "12345678" }).valid).toBe(true);
  });
});
