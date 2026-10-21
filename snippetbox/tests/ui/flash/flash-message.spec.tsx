import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect } from "vitest";
import { FlashMessage } from "@/modules/flash/client";
import { feature, given, scenario, thenExpect, when } from "@tests/support/bdd";
import { navigation } from "@tests/support/navigation";
import { renderWithApp } from "@tests/support/render";
import { createTestWorld, type TestWorld } from "@tests/support/world";

feature("Flash message", () => {
  let world: TestWorld;

  beforeEach(() => {
    world = createTestWorld();
  });

  afterEach(() => world.dispose());

  scenario("a pending message is shown as a status", async () => {
    await given("a pending message", () => world.modules.flash.pushFlash.execute("Hello there"));

    renderWithApp(world, <FlashMessage />);

    await thenExpect("it is announced", async () => {
      expect(await screen.findByRole("status")).toHaveTextContent("Hello there");
    });
  });

  scenario("nothing is rendered when no message is pending", async () => {
    renderWithApp(world, <FlashMessage />);

    await thenExpect("there is no status element", async () => {
      await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    });
  });

  scenario("the message disappears after the visitor navigates", async () => {
    await given("a displayed message", async () => {
      await world.modules.flash.pushFlash.execute("Hello there");
    });
    const view = renderWithApp(world, <FlashMessage />);
    await screen.findByRole("status");

    await when("the visitor navigates to another page", () => {
      navigation.pathname = "/elsewhere";
      view.rerenderApp(<FlashMessage />);
    });

    await thenExpect("the message is gone", async () => {
      await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    });
  });

  scenario("a new message replaces the previous one on navigation", async () => {
    await given("a displayed message", () => world.modules.flash.pushFlash.execute("First"));
    const view = renderWithApp(world, <FlashMessage />);
    await screen.findByText("First");

    await when("another message arrives together with a navigation", async () => {
      await world.modules.flash.pushFlash.execute("Second");
      navigation.pathname = "/elsewhere";
      view.rerenderApp(<FlashMessage />);
    });

    await thenExpect("the new message is shown", async () => {
      expect(await screen.findByText("Second")).toBeInTheDocument();
      expect(screen.queryByText("First")).toBeNull();
    });
  });
});
