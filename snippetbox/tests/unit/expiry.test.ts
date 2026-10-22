import { describe, expect, it } from "vitest";
import { EXPIRY_OPTIONS } from "@/lib/expiry";

describe("EXPIRY_OPTIONS", () => {
  it("offers one year, one week and one day", () => {
    expect(EXPIRY_OPTIONS.map((option) => option.days)).toEqual([365, 7, 1]);
  });

  it("uses one year as the first option", () => {
    expect(EXPIRY_OPTIONS[0]).toEqual({ days: 365, label: "One Year" });
  });

  it("has unique days and labels", () => {
    expect(new Set(EXPIRY_OPTIONS.map((option) => option.days)).size).toBe(EXPIRY_OPTIONS.length);
    expect(new Set(EXPIRY_OPTIONS.map((option) => option.label)).size).toBe(EXPIRY_OPTIONS.length);
  });

  it("only contains positive integer day counts", () => {
    for (const option of EXPIRY_OPTIONS) {
      expect(Number.isInteger(option.days)).toBe(true);
      expect(option.days).toBeGreaterThan(0);
    }
  });
});
