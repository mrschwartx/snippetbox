import { describe, expect, it } from "vitest";
import { validateLogin } from "@/modules/identity/domain/credentials";

describe("validateLogin", () => {
  it("accepts well formed credentials", () => {
    expect(validateLogin({ email: "a@b.co", password: "x" }).valid).toBe(true);
  });

  it("requires email and password", () => {
    const { fieldErrors } = validateLogin({ email: "", password: "" });
    expect(fieldErrors.email).toBe("This field cannot be blank");
    expect(fieldErrors.password).toBe("This field cannot be blank");
  });

  it("rejects a malformed email", () => {
    expect(validateLogin({ email: "x", password: "y" }).fieldErrors.email).toBe(
      "This field must be a valid email address",
    );
  });

  it("does not enforce the password length on login", () => {
    expect(validateLogin({ email: "a@b.co", password: "x" }).fieldErrors.password).toBeUndefined();
  });
});
