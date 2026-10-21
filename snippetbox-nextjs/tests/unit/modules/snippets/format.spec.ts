import { describe, expect, it } from "vitest";
import { humanDate } from "@/modules/snippets/presentation/format";

describe("humanDate", () => {
  it("formats an ISO date in UTC", () => {
    expect(humanDate("2026-10-05T08:03:00.000Z")).toBe("05 Oct 2026 at 08:03");
  });

  it("pads single digit days, hours and minutes", () => {
    expect(humanDate("2026-01-02T03:04:00.000Z")).toBe("02 Jan 2026 at 03:04");
  });

  it("is independent of the local time zone offset in the input", () => {
    expect(humanDate("2026-10-05T10:03:00+02:00")).toBe("05 Oct 2026 at 08:03");
  });

  it("returns an empty string for an invalid date", () => {
    expect(humanDate("not-a-date")).toBe("");
  });
});
