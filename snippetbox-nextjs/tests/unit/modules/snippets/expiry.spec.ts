import { describe, expect, it } from "vitest";
import { PERMITTED_EXPIRES, addDays } from "@/modules/snippets/domain/expiry";

describe("expiry", () => {
  it("permits one day, one week and one year", () => {
    expect([...PERMITTED_EXPIRES]).toEqual([1, 7, 365]);
  });

  it.each([
    [1, "2026-10-16T00:00:00.000Z"],
    [7, "2026-10-22T00:00:00.000Z"],
    [365, "2027-10-15T00:00:00.000Z"],
  ])("addDays moves a date forward by %i days", (days, expected) => {
    expect(addDays(new Date("2026-10-15T00:00:00.000Z"), days).toISOString()).toBe(expected);
  });

  it("does not mutate the input date", () => {
    const date = new Date("2026-10-15T00:00:00.000Z");
    addDays(date, 7);
    expect(date.toISOString()).toBe("2026-10-15T00:00:00.000Z");
  });
});
