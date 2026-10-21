import { describe, expect, it } from "vitest";
import { ValidationError } from "@/shared/kernel/errors";
import {
  TITLE_MAX_LENGTH,
  publishSnippet,
  validateSnippetDraft,
} from "@/modules/snippets/domain/snippet-draft";

const draft = { title: "Hello", content: "world", expires: 7 };
const now = new Date("2026-10-15T08:00:00.000Z");

describe("validateSnippetDraft", () => {
  it("accepts a valid draft", () => {
    expect(validateSnippetDraft(draft).valid).toBe(true);
  });

  it("rejects a blank title", () => {
    expect(validateSnippetDraft({ ...draft, title: " " }).fieldErrors.title).toBe(
      "This field cannot be blank",
    );
  });

  it("rejects a title longer than the maximum", () => {
    const title = "a".repeat(TITLE_MAX_LENGTH + 1);
    expect(validateSnippetDraft({ ...draft, title }).fieldErrors.title).toBe(
      "This field cannot be more than 100 characters long",
    );
  });

  it("accepts a title of exactly the maximum length", () => {
    const title = "a".repeat(TITLE_MAX_LENGTH);
    expect(validateSnippetDraft({ ...draft, title }).valid).toBe(true);
  });

  it("rejects blank content", () => {
    expect(validateSnippetDraft({ ...draft, content: "" }).fieldErrors.content).toBe(
      "This field cannot be blank",
    );
  });

  it.each([0, 2, 30, 366, Number.NaN])("rejects an expiry of %s", (expires) => {
    expect(validateSnippetDraft({ ...draft, expires }).fieldErrors.expires).toBe(
      "This field must equal 1, 7 or 365",
    );
  });

  it("reports every invalid field in a stable order", () => {
    const { fieldErrors } = validateSnippetDraft({ title: "", content: "", expires: 3 });
    expect(Object.keys(fieldErrors)).toEqual(["title", "content", "expires"]);
  });
});

describe("publishSnippet", () => {
  it("creates a new snippet whose expiry is derived from the clock", () => {
    const published = publishSnippet(draft, now);
    expect(published.title).toBe("Hello");
    expect(published.content).toBe("world");
    expect(published.created.toISOString()).toBe("2026-10-15T08:00:00.000Z");
    expect(published.expires.toISOString()).toBe("2026-10-22T08:00:00.000Z");
  });

  it("preserves the content exactly as written", () => {
    const content = "  indented\n\tcode  ";
    expect(publishSnippet({ ...draft, content }, now).content).toBe(content);
  });

  it("refuses an invalid draft", () => {
    expect(() => publishSnippet({ ...draft, title: "" }, now)).toThrow(ValidationError);
  });
});
