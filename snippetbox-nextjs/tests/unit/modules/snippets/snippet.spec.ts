import { describe, expect, it } from "vitest";
import { Snippet, toSnippetDto } from "@/modules/snippets/domain/snippet";

const snippet = Snippet.restore({
  id: 1,
  title: "t",
  content: "c",
  created: new Date("2026-10-15T00:00:00.000Z"),
  expires: new Date("2026-10-16T00:00:00.000Z"),
});

describe("Snippet", () => {
  it("is not expired before the expiry instant", () => {
    expect(snippet.isExpiredAt(new Date("2026-10-15T23:59:59.000Z"))).toBe(false);
  });

  it("is expired at the expiry instant", () => {
    expect(snippet.isExpiredAt(new Date("2026-10-16T00:00:00.000Z"))).toBe(true);
  });

  it("is expired after the expiry instant", () => {
    expect(snippet.isExpiredAt(new Date("2026-10-17T00:00:00.000Z"))).toBe(true);
  });

  it("is serialised to a DTO with ISO timestamps", () => {
    expect(toSnippetDto(snippet)).toEqual({
      id: 1,
      title: "t",
      content: "c",
      created: "2026-10-15T00:00:00.000Z",
      expires: "2026-10-16T00:00:00.000Z",
    });
  });
});
