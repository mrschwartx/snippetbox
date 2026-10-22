import { describe, expect, it } from "vitest";
import { initialFormState } from "@/lib/form";

describe("initialFormState", () => {
  it("starts with no errors and no values", () => {
    expect(initialFormState).toEqual({ errors: {}, values: {} });
  });

  it("has no form level error", () => {
    expect(initialFormState.formError).toBeUndefined();
  });
});
