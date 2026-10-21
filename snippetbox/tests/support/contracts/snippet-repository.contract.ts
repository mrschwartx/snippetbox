import { describe, expect, it } from "vitest";
import type { NewSnippet } from "@/modules/snippets/domain/snippet";
import type { SnippetRepository } from "@/modules/snippets/domain/snippet-repository";

const at = (iso: string) => new Date(iso);

const newSnippet: NewSnippet = {
  title: "title",
  content: "content",
  created: at("2026-10-15T00:00:00.000Z"),
  expires: at("2026-10-16T00:00:00.000Z"),
};

export const snippetRepositoryContract = (
  name: string,
  create: () => SnippetRepository,
) => {
  describe(`${name} honours the SnippetRepository contract`, () => {
    it("assigns incrementing ids and returns the stored snippet", async () => {
      const repository = create();
      const first = await repository.insert(newSnippet);
      const second = await repository.insert(newSnippet);

      expect([first.id, second.id]).toEqual([1, 2]);
      expect(first.created).toEqual(newSnippet.created);
      expect(first.expires).toEqual(newSnippet.expires);
    });

    it("finds a snippet by id with its dates intact", async () => {
      const repository = create();
      const stored = await repository.insert(newSnippet);

      const found = await repository.findById(stored.id);
      expect(found?.title).toBe("title");
      expect(found?.content).toBe("content");
      expect(found?.created).toEqual(newSnippet.created);
      expect(found?.expires).toEqual(newSnippet.expires);
    });

    it("returns null for an unknown id", async () => {
      expect(await create().findById(42)).toBeNull();
    });

    it("preserves multi line content and unicode exactly", async () => {
      const repository = create();
      const content = "line one\n\tindented 日本語 😀\n";
      const stored = await repository.insert({ ...newSnippet, content });
      expect((await repository.findById(stored.id))?.content).toBe(content);
    });

    it("lists only active snippets, newest first, within the limit", async () => {
      const repository = create();
      await repository.insert({ ...newSnippet, title: "expired", expires: at("2026-10-15T01:00:00.000Z") });
      await repository.insert({ ...newSnippet, title: "a" });
      await repository.insert({ ...newSnippet, title: "b" });
      await repository.insert({ ...newSnippet, title: "c" });

      const latest = await repository.findLatestActive(at("2026-10-15T02:00:00.000Z"), 2);
      expect(latest.map((snippet) => snippet.title)).toEqual(["c", "b"]);
    });

    it("treats a snippet expiring exactly now as inactive", async () => {
      const repository = create();
      await repository.insert(newSnippet);
      expect(await repository.findLatestActive(newSnippet.expires, 10)).toEqual([]);
    });
  });
};
