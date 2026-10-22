import { describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { createSnippet, getLatestSnippets, getSnippet } from "@/lib/snippets";

const DAY = 24 * 60 * 60 * 1000;

function freezeAt(iso: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
}

describe("createSnippet", () => {
  it("returns incrementing numeric ids", () => {
    const first = createSnippet("a", "b", 1);
    const second = createSnippet("c", "d", 1);
    expect(typeof first).toBe("number");
    expect(second).toBe(first + 1);
  });

  it("stores created now and expiry after the requested days", () => {
    freezeAt("2026-10-22T00:00:00.000Z");
    const id = createSnippet("Title", "Body", 7);
    const snippet = getSnippet(id);
    expect(snippet).toEqual({
      id,
      title: "Title",
      content: "Body",
      created: "2026-10-22T00:00:00.000Z",
      expires: "2026-10-29T00:00:00.000Z",
    });
  });

  it.each([1, 7, 365])("expires exactly %i days later", (days) => {
    freezeAt("2026-01-01T00:00:00.000Z");
    const id = createSnippet("t", "c", days);
    const snippet = getSnippet(id)!;
    expect(new Date(snippet.expires).getTime() - new Date(snippet.created).getTime()).toBe(days * DAY);
  });

  it("preserves multi-line content, unicode and whitespace exactly", () => {
    const content = "  line one\n\tline two\n🙂 日本語  \n";
    const id = createSnippet("Ünïcode ✓", content, 1);
    expect(getSnippet(id)).toMatchObject({ title: "Ünïcode ✓", content });
  });

  it("stores SQL metacharacters literally", () => {
    const title = "x'); DROP TABLE snippets; --";
    const id = createSnippet(title, "' OR 1=1 --", 1);
    expect(getSnippet(id)).toMatchObject({ title, content: "' OR 1=1 --" });
    expect(getLatestSnippets()).toHaveLength(1);
  });
});

describe("getSnippet", () => {
  it("returns undefined for an unknown id", () => {
    expect(getSnippet(12345)).toBeUndefined();
  });

  it("returns undefined once the snippet has expired", () => {
    freezeAt("2026-10-22T00:00:00.000Z");
    const id = createSnippet("t", "c", 1);
    expect(getSnippet(id)).toBeDefined();
    vi.setSystemTime(new Date("2026-10-23T00:00:00.001Z"));
    expect(getSnippet(id)).toBeUndefined();
  });

  it("treats the exact expiry instant as expired", () => {
    freezeAt("2026-10-22T00:00:00.000Z");
    const id = createSnippet("t", "c", 1);
    vi.setSystemTime(new Date("2026-10-23T00:00:00.000Z"));
    expect(getSnippet(id)).toBeUndefined();
  });

  it("is still visible one millisecond before expiry", () => {
    freezeAt("2026-10-22T00:00:00.000Z");
    const id = createSnippet("t", "c", 1);
    vi.setSystemTime(new Date("2026-10-22T23:59:59.999Z"));
    expect(getSnippet(id)).toBeDefined();
  });
});

describe("getLatestSnippets", () => {
  it("returns an empty list when nothing exists", () => {
    expect(getLatestSnippets()).toEqual([]);
  });

  it("orders newest first by id", () => {
    createSnippet("one", "c", 1);
    createSnippet("two", "c", 1);
    createSnippet("three", "c", 1);
    expect(getLatestSnippets().map((snippet) => snippet.title)).toEqual(["three", "two", "one"]);
  });

  it("limits to ten by default", () => {
    for (let index = 0; index < 15; index += 1) createSnippet(`s${index}`, "c", 1);
    const latest = getLatestSnippets();
    expect(latest).toHaveLength(10);
    expect(latest[0].title).toBe("s14");
    expect(latest[9].title).toBe("s5");
  });

  it("honours a custom limit", () => {
    for (let index = 0; index < 5; index += 1) createSnippet(`s${index}`, "c", 1);
    expect(getLatestSnippets(2)).toHaveLength(2);
  });

  it("omits expired snippets", () => {
    freezeAt("2026-10-22T00:00:00.000Z");
    createSnippet("short", "c", 1);
    createSnippet("long", "c", 365);
    vi.setSystemTime(new Date("2026-10-25T00:00:00.000Z"));
    expect(getLatestSnippets().map((snippet) => snippet.title)).toEqual(["long"]);
  });

  it("includes every column of a snippet", () => {
    createSnippet("t", "c", 1);
    expect(Object.keys(getLatestSnippets()[0]).sort()).toEqual(["content", "created", "expires", "id", "title"]);
  });

  it("does not reuse ids of deleted snippets", () => {
    const first = createSnippet("a", "c", 1);
    getDb().prepare("DELETE FROM snippets WHERE id = ?").run(first);
    expect(createSnippet("b", "c", 1)).toBeGreaterThan(first);
  });
});
