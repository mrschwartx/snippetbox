import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect } from "vitest";
import {
  HomePage,
  SnippetCreatePage,
  SnippetViewPage,
} from "@/modules/snippets/client";
import { UnauthenticatedError } from "@/shared/kernel/errors";
import { feature, given, scenario, thenExpect, when } from "@tests/support/bdd";
import { navigation } from "@tests/support/navigation";
import { createInProcessGateways, renderWithApp } from "@tests/support/render";
import { createTestWorld, registerAndLogin, type TestWorld } from "@tests/support/world";

const draft = { title: "Hello world", content: "console.log('hi')", expires: 7 };

feature("Snippet screens", () => {
  let world: TestWorld;

  beforeEach(() => {
    world = createTestWorld();
    navigation.params = { id: "1" };
  });

  afterEach(() => world.dispose());

  scenario("the home page is empty at first", async () => {
    renderWithApp(world, <HomePage />);

    await thenExpect("it says there is nothing to see", async () => {
      expect(await screen.findByText("There's nothing to see here... yet!")).toBeInTheDocument();
    });
  });

  scenario("the home page lists published snippets", async () => {
    await given("a published snippet", async () => {
      await registerAndLogin(world);
      await world.modules.snippets.createSnippet.execute(draft);
    });

    renderWithApp(world, <HomePage />);

    await thenExpect("it is linked from the table with its id and date", async () => {
      const link = await screen.findByRole("link", { name: "Hello world" });
      expect(link).toHaveAttribute("href", "/snippet/view/1");
      expect(screen.getByText("#1")).toBeInTheDocument();
      expect(screen.getByText("15 Oct 2026 at 08:00")).toBeInTheDocument();
    });
  });

  scenario("a snippet page shows its content and dates", async () => {
    await given("a published snippet", async () => {
      await registerAndLogin(world);
      await world.modules.snippets.createSnippet.execute(draft);
    });

    renderWithApp(world, <SnippetViewPage />);

    await thenExpect("title, code and dates are visible", async () => {
      expect(await screen.findByText("Hello world")).toBeInTheDocument();
      expect(screen.getByText("console.log('hi')")).toBeInTheDocument();
      expect(screen.getByText("Created: 15 Oct 2026 at 08:00")).toBeInTheDocument();
      expect(screen.getByText("Expires: 22 Oct 2026 at 08:00")).toBeInTheDocument();
    });
  });

  scenario("snippet content is rendered as text rather than markup", async () => {
    await given("a snippet containing HTML", async () => {
      await registerAndLogin(world);
      await world.modules.snippets.createSnippet.execute({
        ...draft,
        content: "<script>alert(1)</script>",
      });
    });

    const view = renderWithApp(world, <SnippetViewPage />);

    await thenExpect("the markup is escaped", async () => {
      expect(await screen.findByText("<script>alert(1)</script>")).toBeInTheDocument();
      expect(view.container.querySelector("script")).toBeNull();
    });
  });

  scenario("unknown and malformed snippet ids show not found", async () => {
    for (const id of ["42", "abc"]) {
      navigation.params = { id };
      const view = renderWithApp(world, <SnippetViewPage />);

      await thenExpect(`snippet ${id} is not found`, async () => {
        expect(await screen.findByText("Not Found")).toBeInTheDocument();
      });
      view.unmount();
    }
  });

  scenario("an unexpected failure shows a friendly message", async () => {
    const base = createInProcessGateways(world);
    renderWithApp(world, <SnippetViewPage />, {
      snippets: { ...base.snippets, get: async () => { throw new Error("boom"); } },
    });

    await thenExpect("the generic error is displayed", async () => {
      expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    });
  });

  scenario("an anonymous visitor is sent to login from the create page", async () => {
    renderWithApp(world, <SnippetCreatePage />);

    await thenExpect("they are redirected and the form is hidden", async () => {
      await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/user/login"));
      expect(screen.queryByRole("button", { name: "Publish snippet" })).toBeNull();
    });
  });

  scenario("a logged in user publishes a snippet", async () => {
    const user = userEvent.setup();
    await given("a logged in user", () => registerAndLogin(world));
    renderWithApp(world, <SnippetCreatePage />);

    await when("they fill and submit the form", async () => {
      await user.type(await screen.findByLabelText("Title:"), "My snippet");
      await user.type(screen.getByLabelText("Content:"), "SELECT 1;");
      await user.click(screen.getByLabelText(/One Week/));
      await user.click(screen.getByRole("button", { name: "Publish snippet" }));
    });

    await thenExpect("they are sent to the new snippet which expires in a week", async () => {
      await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/snippet/view/1"));
      const [stored] = await world.modules.snippets.listLatestSnippets.execute();
      expect(stored.expires).toBe("2026-10-22T08:00:00.000Z");
    });
  });

  scenario("the create form offers the expiries from longest to shortest", async () => {
    await given("a logged in user", () => registerAndLogin(world));
    renderWithApp(world, <SnippetCreatePage />);

    await thenExpect("the radio options are ordered", async () => {
      await screen.findByLabelText(/One Year/);
      const labels = screen.getAllByRole("radio").map((radio) => radio.parentElement?.textContent?.trim());
      expect(labels).toEqual(["One Year", "One Week", "One Day"]);
    });
  });

  scenario("the create form defaults to one year and reports errors", async () => {
    const user = userEvent.setup();
    await given("a logged in user", () => registerAndLogin(world));
    renderWithApp(world, <SnippetCreatePage />);

    await thenExpect("one year is preselected", async () => {
      expect(await screen.findByLabelText(/One Year/)).toBeChecked();
    });

    await when("they submit an empty form", () =>
      user.click(screen.getByRole("button", { name: "Publish snippet" })),
    );

    await thenExpect("title and content errors are displayed", async () => {
      expect(await screen.findAllByText("This field cannot be blank")).toHaveLength(2);
      expect(navigation.push).not.toHaveBeenCalled();
    });
  });

  scenario("a session that expired while typing sends the user to login", async () => {
    const user = userEvent.setup();
    await given("a logged in user on the create page", () => registerAndLogin(world));
    const base = createInProcessGateways(world);
    renderWithApp(world, <SnippetCreatePage />, {
      snippets: { ...base.snippets, create: async () => { throw new UnauthenticatedError(); } },
    });

    await when("they submit after the server forgot them", async () => {
      await user.type(await screen.findByLabelText("Title:"), "t");
      await user.type(screen.getByLabelText("Content:"), "c");
      await user.click(screen.getByRole("button", { name: "Publish snippet" }));
    });

    await thenExpect("they are redirected to the login page", async () => {
      await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/user/login"));
    });
  });
});
