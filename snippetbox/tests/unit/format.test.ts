import { describe, expect, it } from "vitest";
import { humanDate } from "@/lib/format";

describe("humanDate", () => {
  it("formats an ISO timestamp in UTC", () => {
    expect(humanDate("2026-10-22T04:05:00.000Z")).toBe("22 Oct 2026 at 04:05");
  });

  it("zero-pads day, hours and minutes", () => {
    expect(humanDate("2026-03-02T01:02:00.000Z")).toBe("02 Mar 2026 at 01:02");
  });

  it("handles midnight", () => {
    expect(humanDate("2026-01-01T00:00:00.000Z")).toBe("01 Jan 2026 at 00:00");
  });

  it("handles the last minute of the year", () => {
    expect(humanDate("2026-12-31T23:59:59.999Z")).toBe("31 Dec 2026 at 23:59");
  });

  it("converts offsets to UTC", () => {
    expect(humanDate("2026-06-15T10:30:00+07:00")).toBe("15 Jun 2026 at 03:30");
  });

  it.each([
    ["2026-01-10T00:00:00Z", "Jan"],
    ["2026-02-10T00:00:00Z", "Feb"],
    ["2026-03-10T00:00:00Z", "Mar"],
    ["2026-04-10T00:00:00Z", "Apr"],
    ["2026-05-10T00:00:00Z", "May"],
    ["2026-06-10T00:00:00Z", "Jun"],
    ["2026-07-10T00:00:00Z", "Jul"],
    ["2026-08-10T00:00:00Z", "Aug"],
    ["2026-09-10T00:00:00Z", "Sep"],
    ["2026-10-10T00:00:00Z", "Oct"],
    ["2026-11-10T00:00:00Z", "Nov"],
    ["2026-12-10T00:00:00Z", "Dec"],
  ])("renders %s with month %s", (iso, month) => {
    expect(humanDate(iso)).toContain(` ${month} `);
  });
});
