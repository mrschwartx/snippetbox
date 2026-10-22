import { beforeEach, describe, expect, it } from "vitest";
import { createSnippetAction } from "@/actions/snippets";
import { createUser, findUserByEmail, startSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { FLASH_COOKIE } from "@/lib/flash";
import { initialFormState } from "@/lib/form";
import { getSnippet } from "@/lib/snippets";
import { cookieJar } from "../helpers/cookie-jar";
import { formData } from "../helpers/forms";
import { redirectTarget } from "../helpers/navigation";

const valid = { title: "Hello", content: "world", expires: "7" };
const submit = (fields: Record<string, string>) => createSnippetAction(initialFormState, formData(fields));
const snippetCount = () => (getDb().prepare("SELECT COUNT(*) AS n FROM snippets").get() as { n: number }).n;

describe("createSnippetAction", () => {
  describe("when signed out", () => {
    it("redirects to login and stores nothing", async () => {
      expect(await redirectTarget(() => submit(valid))).toBe("/user/login");
      expect(snippetCount()).toBe(0);
    });

    it("redirects even when the input is invalid", async () => {
      expect(await redirectTarget(() => submit({ title: "", content: "", expires: "" }))).toBe("/user/login");
    });
  });

  describe("when signed in", () => {
    beforeEach(async () => {
      await createUser("Ada", "ada@example.com", "password123");
      await startSession(findUserByEmail("ada@example.com")!.id);
    });

    it("stores the snippet, flashes and redirects to its page", async () => {
      const target = await redirectTarget(() => submit(valid));
      const id = Number(target?.split("/").pop());
      expect(target).toBe(`/snippet/view/${id}`);
      expect(getSnippet(id)).toMatchObject({ title: "Hello", content: "world" });
      expect(cookieJar.get(FLASH_COOKIE)?.value).toBe("Snippet successfully created!");
    });

    it.each(["1", "7", "365"])("accepts an expiry of %s days", async (expires) => {
      const target = await redirectTarget(() => submit({ ...valid, expires }));
      const snippet = getSnippet(Number(target?.split("/").pop()))!;
      const days = (new Date(snippet.expires).getTime() - new Date(snippet.created).getTime()) / 86_400_000;
      expect(days).toBe(Number(expires));
    });

    it("reports every blank field", async () => {
      const state = await submit({ title: "", content: "", expires: "" });
      expect(state.errors).toEqual({
        title: "This field cannot be blank",
        content: "This field cannot be blank",
        expires: "This field must equal 1, 7 or 365",
      });
      expect(snippetCount()).toBe(0);
    });

    it("treats whitespace only title and content as blank", async () => {
      const state = await submit({ title: "   ", content: "\n\t ", expires: "1" });
      expect(state.errors.title).toBe("This field cannot be blank");
      expect(state.errors.content).toBe("This field cannot be blank");
    });

    it("accepts a title of exactly one hundred characters", async () => {
      const target = await redirectTarget(() => submit({ ...valid, title: "a".repeat(100) }));
      expect(target).toMatch(/^\/snippet\/view\/\d+$/);
    });

    it("rejects a title of one hundred and one characters", async () => {
      const state = await submit({ ...valid, title: "a".repeat(101) });
      expect(state.errors.title).toBe("This field cannot be more than 100 characters long");
    });

    it("counts characters rather than UTF-16 units for the title limit", async () => {
      expect(await redirectTarget(() => submit({ ...valid, title: "🙂".repeat(100) }))).toMatch(/^\/snippet\/view\//);
      const state = await submit({ ...valid, title: "🙂".repeat(101) });
      expect(state.errors.title).toBe("This field cannot be more than 100 characters long");
    });

    it.each(["0", "2", "30", "-1", "366", "abc", "7.5", "1e0x", " "])("rejects the expiry %j", async (expires) => {
      const state = await submit({ ...valid, expires });
      expect(state.errors.expires).toBe("This field must equal 1, 7 or 365");
      expect(snippetCount()).toBe(0);
    });

    it("keeps submitted values for redisplay on error", async () => {
      const state = await submit({ title: "", content: "keep me", expires: "30" });
      expect(state.values).toEqual({ title: "", content: "keep me", expires: "30" });
    });

    it("does not flash when validation fails", async () => {
      await submit({ title: "", content: "", expires: "" });
      expect(cookieJar.has(FLASH_COOKIE)).toBe(false);
    });

    it("keeps content and title exactly as typed", async () => {
      const content = "  indented\n<script>alert(1)</script>\n";
      const target = await redirectTarget(() => submit({ title: " <i>x</i> ", content, expires: "1" }));
      const snippet = getSnippet(Number(target?.split("/").pop()));
      expect(snippet).toMatchObject({ title: " <i>x</i> ", content });
    });

    it("treats missing fields as blank", async () => {
      const state = await createSnippetAction(initialFormState, new FormData());
      expect(Object.keys(state.errors).sort()).toEqual(["content", "expires", "title"]);
    });
  });
});
