import { describe, expect, it, vi } from "vitest";
import { DuplicateEmailError } from "@/modules/identity/domain/errors";
import {
  BadRequestError,
  fromErrorBody,
  toErrorResponse,
} from "@/shared/infrastructure/http/error-mapping";
import {
  RecordNotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "@/shared/kernel/errors";

const roundTrip = async (error: unknown) => {
  const response = toErrorResponse(error);
  return { status: response.status, error: fromErrorBody(await response.json()) };
};

describe("toErrorResponse", () => {
  it.each([
    [new ValidationError({ a: "b" }), 422],
    [new UnauthenticatedError(), 401],
    [new RecordNotFoundError(), 404],
    [new DuplicateEmailError(), 409],
    [new BadRequestError(), 400],
    [new BadRequestError(415), 415],
  ])("maps %o to status %i", (error, status) => {
    expect(toErrorResponse(error).status).toBe(status);
  });

  it("exposes field and non field errors of a validation error", async () => {
    const body = await toErrorResponse(new ValidationError({ title: "bad" }, ["oops"])).json();
    expect(body.error).toEqual({
      code: "VALIDATION",
      message: "Validation failed",
      fieldErrors: { title: "bad" },
      nonFieldErrors: ["oops"],
    });
  });

  it("exposes only code and message for other domain errors", async () => {
    const body = await toErrorResponse(new RecordNotFoundError()).json();
    expect(body).toEqual({ error: { code: "NO_RECORD", message: "No matching record found" } });
  });

  it("reports bad requests with their own message", async () => {
    const body = await toErrorResponse(new BadRequestError(415, "nope")).json();
    expect(body.error).toEqual({ code: "BAD_REQUEST", message: "nope" });
  });

  it("hides unexpected failures and logs them", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = toErrorResponse(new Error("secret database detail"));
    const body = await response.json();
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();

    expect(response.status).toBe(500);
    expect(body.error).toEqual({ code: "INTERNAL", message: "Internal server error" });
    expect(JSON.stringify(body)).not.toContain("secret");
  });
});

describe("fromErrorBody", () => {
  it("round-trips a validation error with its messages", async () => {
    const { error } = await roundTrip(new ValidationError({ title: "bad" }, ["oops"]));
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors).toEqual({ title: "bad" });
    expect((error as ValidationError).nonFieldErrors).toEqual(["oops"]);
  });

  it("round-trips unauthenticated and not found errors", async () => {
    expect((await roundTrip(new UnauthenticatedError())).error).toBeInstanceOf(UnauthenticatedError);
    expect((await roundTrip(new RecordNotFoundError())).error).toBeInstanceOf(RecordNotFoundError);
  });

  it("falls back to a generic error with the server message", () => {
    const error = fromErrorBody({ error: { code: "WHATEVER", message: "custom" } });
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("custom");
  });

  it.each([null, undefined, "text", 42, {}, { error: "x" }])(
    "survives a malformed body (%o)",
    (body) => {
      expect(fromErrorBody(body).message).toBe("Request failed");
    },
  );

  it("tolerates malformed validation details", () => {
    const error = fromErrorBody({
      error: { code: "VALIDATION", fieldErrors: "x", nonFieldErrors: "y" },
    }) as ValidationError;
    expect(error.fieldErrors).toEqual({});
    expect(error.nonFieldErrors).toEqual([]);
  });
});
