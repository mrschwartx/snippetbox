import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect } from "vitest";
import { SnippetCreatePage } from "@/modules/snippets/client";
import { SiteFooter } from "@/shell/site-footer";
import { SiteHeader } from "@/shell/site-header";
import { SiteNav } from "@/shell/site-nav";
import { feature, given, scenario, thenExpect, when } from "@tests/support/bdd";
import { navigation } from "@tests/support/navigation";
import { renderWithApp } from "@tests/support/render";
import { createTestWorld, registerAndLogin, type TestWorld } from "@tests/support/world";

feature("Site shell", () => {
  let world: TestWorld;

  beforeEach(() => {
    world = createTestWorld();
  });

  afterEach(() => world.dispose());

  scenario("the navigation offers signup and login to a guest", async () => {
    renderWithApp(world, <SiteNav />);

    await thenExpect("only guest links are visible", async () => {
      expect(await screen.findByRole("link", { name: "Signup" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Create snippet" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Logout" })).toBeNull();
    });
  });

  scenario("the navigation offers create and logout to a member", async () => {
    await given("a logged in user", () => registerAndLogin(world));
    renderWithApp(world, <SiteNav />);

    await thenExpect("only member links are visible", async () => {
      expect(await screen.findByRole("button", { name: "Logout" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Create snippet" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Login" })).toBeNull();
      expect(screen.queryByRole("link", { name: "Signup" })).toBeNull();
    });
  });

  scenario("logging out returns home as a guest", async () => {
    const user = userEvent.setup();
    await given("a logged in user", () => registerAndLogin(world));
    renderWithApp(world, <SiteNav />);

    await when("the user clicks logout", async () => {
      await user.click(await screen.findByRole("button", { name: "Logout" }));
    });

    await thenExpect("they are redirected home and the session is gone", async () => {
      await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/"));
      expect(await screen.findByRole("link", { name: "Login" })).toBeInTheDocument();
      expect(await world.modules.identity.getCurrentUser.execute()).toBeNull();
    });
  });

  scenario("logging out from a protected page lands on the home page, not on login", async () => {
    const user = userEvent.setup();
    await given("a logged in user on the create page", () => registerAndLogin(world));
    renderWithApp(
      world,
      <>
        <SiteNav />
        <SnippetCreatePage />
      </>,
    );
    await screen.findByRole("button", { name: "Publish snippet" });

    await when("the user clicks logout", () =>
      user.click(screen.getByRole("button", { name: "Logout" })),
    );

    await thenExpect("only the redirect home happens and the form disappears", async () => {
      await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/"));
      await waitFor(() => expect(screen.queryByRole("button", { name: "Publish snippet" })).toBeNull());
      expect(navigation.replace).not.toHaveBeenCalled();
    });
  });

  scenario("a visitor who never logged in is still sent to login from a protected page", async () => {
    renderWithApp(world, <SnippetCreatePage />);

    await thenExpect("they are redirected to login", async () => {
      await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/user/login"));
    });
  });

  scenario("the active navigation link is highlighted", async () => {
    navigation.pathname = "/user/login";
    renderWithApp(world, <SiteNav />);

    await thenExpect("only the login link is live", async () => {
      expect(await screen.findByRole("link", { name: "Login" })).toHaveClass("live");
      expect(screen.getByRole("link", { name: "Signup" })).not.toHaveClass("live");
    });
  });

  scenario("the header links home", async () => {
    renderWithApp(world, <SiteHeader />);

    await thenExpect("the title is a link to the root", () => {
      expect(screen.getByRole("link", { name: "Snippetbox" })).toHaveAttribute("href", "/");
    });
  });

  scenario("the footer credits Next.js with the current year", async () => {
    renderWithApp(world, <SiteFooter />);

    await thenExpect("the year is rendered after hydration", async () => {
      expect(await screen.findByText(new RegExp(`in ${new Date().getFullYear()}`))).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Next.js" })).toHaveAttribute("href", "https://nextjs.org/");
    });
  });
});
