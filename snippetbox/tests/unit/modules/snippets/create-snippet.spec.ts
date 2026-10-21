import { beforeEach, expect } from "vitest";
import { CreateSnippet } from "@/modules/snippets/application/create-snippet";
import { UnauthenticatedError, ValidationError } from "@/shared/kernel/errors";
import { feature, given, scenario, thenExpect, when } from "@tests/support/bdd";
import {
  FixedClock,
  InMemorySnippetRepository,
  RecordingNotifier,
  StubAuthenticator,
} from "@tests/support/in-memory";

const draft = { title: "Hello", content: "fmt.Println()", expires: 7 };

feature("Creating snippets", () => {
  let snippets: InMemorySnippetRepository;
  let authenticator: StubAuthenticator;
  let notifier: RecordingNotifier;
  let create: CreateSnippet;

  beforeEach(() => {
    snippets = new InMemorySnippetRepository();
    authenticator = new StubAuthenticator(false);
    notifier = new RecordingNotifier();
    create = new CreateSnippet(snippets, authenticator, notifier, new FixedClock());
  });

  scenario("an anonymous visitor cannot create a snippet", async () => {
    const error = await when("an anonymous visitor submits a snippet", () =>
      create.execute(draft).catch((e: unknown) => e),
    );

    await thenExpect("authentication is required and nothing is stored", () => {
      expect(error).toBeInstanceOf(UnauthenticatedError);
      expect(snippets.count).toBe(0);
      expect(notifier.messages).toEqual([]);
    });
  });

  scenario("authentication is checked before validation", async () => {
    const error = await when("an anonymous visitor submits an invalid snippet", () =>
      create.execute({ title: "", content: "", expires: 0 }).catch((e: unknown) => e),
    );

    await thenExpect("they are told to authenticate first", () => {
      expect(error).toBeInstanceOf(UnauthenticatedError);
    });
  });

  scenario("a logged in user creates a snippet", async () => {
    await given("a logged in user", () => {
      authenticator.authenticated = true;
    });

    const snippet = await when("they create a snippet", () => create.execute(draft));

    await thenExpect("it gets the first id and a seven day expiry", () => {
      expect(snippet).toEqual({
        id: 1,
        title: "Hello",
        content: "fmt.Println()",
        created: "2026-10-15T08:00:00.000Z",
        expires: "2026-10-22T08:00:00.000Z",
      });
    });

    await thenExpect("the user is notified", () => {
      expect(notifier.messages).toEqual(["Snippet successfully created!"]);
    });
  });

  scenario("an invalid snippet is rejected and nothing is stored", async () => {
    await given("a logged in user", () => {
      authenticator.authenticated = true;
    });

    const error = await when("they submit an invalid snippet", () =>
      create.execute({ title: "", content: "", expires: 3 }).catch((e: unknown) => e),
    );

    await thenExpect("every field reports an error", () => {
      expect(error).toBeInstanceOf(ValidationError);
      expect(Object.keys((error as ValidationError).fieldErrors)).toEqual([
        "title",
        "content",
        "expires",
      ]);
      expect(snippets.count).toBe(0);
      expect(notifier.messages).toEqual([]);
    });
  });
});
