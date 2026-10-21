import { describe, expect, it } from "vitest";
import { DomainError } from "@/shared/kernel/domain-error";
import {
  RecordNotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "@/shared/kernel/errors";

describe("shared domain errors", () => {
  it.each([
    [new ValidationError({ a: "b" }), "validation", "VALIDATION"],
    [new UnauthenticatedError(), "unauthenticated", "UNAUTHENTICATED"],
    [new RecordNotFoundError(), "not-found", "NO_RECORD"],
  ])("%o exposes its kind and code", (error, kind, code) => {
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
    expect(error.kind).toBe(kind);
    expect(error.code).toBe(code);
  });

  it("uses the class name as the error name", () => {
    expect(new RecordNotFoundError().name).toBe("RecordNotFoundError");
  });

  it("keeps field and non field errors on validation errors", () => {
    const error = new ValidationError({ email: "bad" }, ["oops"]);
    expect(error.fieldErrors).toEqual({ email: "bad" });
    expect(error.nonFieldErrors).toEqual(["oops"]);
  });

  it("defaults non field errors to an empty list", () => {
    expect(new ValidationError({}).nonFieldErrors).toEqual([]);
  });
});
