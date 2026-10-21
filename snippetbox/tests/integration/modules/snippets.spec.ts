import { afterEach, beforeEach, expect } from "vitest";
import {
  RecordNotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "@/shared/kernel/errors";
import { feature, given, scenario, thenExpect, when } from "@tests/support/bdd";
import { createTestWorld, registerAndLogin, type TestWorld } from "@tests/support/world";

const draft = { title: "Hello", content: "fmt.Println()", expires: 7 };

feature("Snippets across modules with real persistence", () => {
  let world: TestWorld;

  beforeEach(() => {
    world = createTestWorld();
  });

  afterEach(() => world.dispose());

  scenario("an anonymous visitor cannot create a snippet", async () => {
    const error = await when("an anonymous visitor creates a snippet", () =>
      world.modules.snippets.createSnippet.execute(draft).catch((e: unknown) => e),
    );

    await thenExpect("authentication is required", () => {
      expect(error).toBeInstanceOf(UnauthenticatedError);
    });
  });

  scenario("the identity module decides who may create a snippet", async () => {
    await given("a user who logged in and then out", async () => {
      await registerAndLogin(world);
      await world.modules.identity.logoutUser.execute();
    });

    const error = await when("they try to create a snippet", () =>
      world.modules.snippets.createSnippet.execute(draft).catch((e: unknown) => e),
    );

    await thenExpect("they are rejected again", () => {
      expect(error).toBeInstanceOf(UnauthenticatedError);
    });
  });

  scenario("a logged in user creates a snippet and is notified through the flash module", async () => {
    await given("a logged in user", () => registerAndLogin(world));

    const snippet = await when("they create a snippet", () =>
      world.modules.snippets.createSnippet.execute(draft),
    );

    await thenExpect("it gets the first id and a seven day expiry", () => {
      expect(snippet.id).toBe(1);
      expect(snippet.created).toBe("2026-10-15T08:00:00.000Z");
      expect(snippet.expires).toBe("2026-10-22T08:00:00.000Z");
    });

    await thenExpect("a flash message confirms it", async () => {
      expect(await world.modules.flash.popFlash.execute()).toBe("Snippet successfully created!");
    });
  });

  scenario("an invalid snippet is rejected and nothing is stored", async () => {
    await given("a logged in user", () => registerAndLogin(world));

    const error = await when("they create an invalid snippet", () =>
      world.modules.snippets.createSnippet
        .execute({ title: "", content: "", expires: 3 })
        .catch((e: unknown) => e),
    );

    await thenExpect("each field reports an error and the table stays empty", async () => {
      expect(error).toBeInstanceOf(ValidationError);
      expect(Object.keys((error as ValidationError).fieldErrors)).toEqual(["title", "content", "expires"]);
      expect(await world.modules.snippets.listLatestSnippets.execute()).toEqual([]);
    });
  });

  scenario("the latest snippets are listed newest first", async () => {
    await given("a user with twelve snippets", async () => {
      await registerAndLogin(world);
      for (let index = 1; index <= 12; index += 1) {
        await world.modules.snippets.createSnippet.execute({ ...draft, title: `S${index}` });
      }
    });

    const latest = await when("the home page lists them", () =>
      world.modules.snippets.listLatestSnippets.execute(),
    );

    await thenExpect("only the ten newest are returned in descending order", () => {
      expect(latest.map((snippet) => snippet.title)).toEqual([
        "S12", "S11", "S10", "S9", "S8", "S7", "S6", "S5", "S4", "S3",
      ]);
    });
  });

  scenario("expired snippets disappear but stay in storage", async () => {
    await given("a snippet that expires in one day", async () => {
      await registerAndLogin(world);
      await world.modules.snippets.createSnippet.execute({ ...draft, expires: 1 });
    });

    await when("two days pass", () => world.clock.advanceDays(2));

    await thenExpect("it is not listed and cannot be opened", async () => {
      expect(await world.modules.snippets.listLatestSnippets.execute()).toEqual([]);
      await expect(world.modules.snippets.getSnippet.execute(1)).rejects.toBeInstanceOf(RecordNotFoundError);
      expect(world.database.prepare("SELECT COUNT(*) AS n FROM snippets").get()).toEqual({ n: 1 });
    });
  });

  scenario("a snippet can be viewed by anyone", async () => {
    await given("a published snippet and a visitor who is not logged in", async () => {
      await registerAndLogin(world);
      await world.modules.snippets.createSnippet.execute(draft);
      await world.modules.identity.logoutUser.execute();
    });

    const snippet = await when("the anonymous visitor opens it", () =>
      world.modules.snippets.getSnippet.execute(1),
    );

    await thenExpect("its content is returned", () => {
      expect(snippet.title).toBe("Hello");
    });
  });
});
