import { beforeEach, describe, expect, it } from "vitest";
import { CreateSnippet } from "@/modules/snippets/application/create-snippet";
import { GetSnippet } from "@/modules/snippets/application/get-snippet";
import { ListLatestSnippets } from "@/modules/snippets/application/list-latest-snippets";
import { RecordNotFoundError } from "@/shared/kernel/errors";
import { feature, given, scenario, thenExpect, when } from "@tests/support/bdd";
import {
  FixedClock,
  InMemorySnippetRepository,
  RecordingNotifier,
  StubAuthenticator,
} from "@tests/support/in-memory";

const draft = { title: "Hello", content: "world", expires: 7 };

feature("Reading snippets", () => {
  let snippets: InMemorySnippetRepository;
  let clock: FixedClock;
  let create: CreateSnippet;
  let get: GetSnippet;
  let list: ListLatestSnippets;

  beforeEach(() => {
    snippets = new InMemorySnippetRepository();
    clock = new FixedClock();
    create = new CreateSnippet(
      snippets,
      new StubAuthenticator(true),
      new RecordingNotifier(),
      clock,
    );
    get = new GetSnippet(snippets, clock);
    list = new ListLatestSnippets(snippets, clock);
  });

  scenario("the latest snippets are listed newest first and capped at ten", async () => {
    await given("twelve published snippets", async () => {
      for (let index = 1; index <= 12; index += 1) {
        await create.execute({ ...draft, title: `S${index}` });
      }
    });

    const latest = await when("the home page lists them", () => list.execute());

    await thenExpect("the ten newest are returned in descending order", () => {
      expect(latest.map((snippet) => snippet.title)).toEqual([
        "S12", "S11", "S10", "S9", "S8", "S7", "S6", "S5", "S4", "S3",
      ]);
    });
  });

  scenario("expired snippets disappear from the list and cannot be opened", async () => {
    await given("a snippet that lives one day", () => create.execute({ ...draft, expires: 1 }));

    await when("two days pass", () => clock.advanceDays(2));

    await thenExpect("it is neither listed nor readable", async () => {
      expect(await list.execute()).toEqual([]);
      await expect(get.execute(1)).rejects.toBeInstanceOf(RecordNotFoundError);
    });
  });

  scenario("a snippet is still readable on the last moment before it expires", async () => {
    await given("a snippet that lives one day", () => create.execute({ ...draft, expires: 1 }));

    await when("almost one day passes", () => clock.advanceHours(23.99));

    await thenExpect("it can be opened", async () => {
      expect((await get.execute(1)).title).toBe("Hello");
    });
  });

  scenario("a published snippet is returned as a DTO", async () => {
    await given("a published snippet", () => create.execute(draft));

    const snippet = await when("it is opened", () => get.execute(1));

    await thenExpect("its fields are plain serialisable values", () => {
      expect(snippet).toEqual({
        id: 1,
        title: "Hello",
        content: "world",
        created: "2026-10-15T08:00:00.000Z",
        expires: "2026-10-22T08:00:00.000Z",
      });
    });
  });

  describe("identifiers that cannot match a snippet", () => {
    it.each([0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 42])(
      "%s is not found",
      async (id) => {
        await expect(get.execute(id)).rejects.toBeInstanceOf(RecordNotFoundError);
      },
    );
  });
});
