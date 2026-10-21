import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect } from "vitest";
import { LoginPage } from "@/modules/identity/client";
import { SignupPage } from "@/modules/identity/client";
import { feature, given, scenario, thenExpect, when } from "@tests/support/bdd";
import { createInProcessGateways, renderWithApp } from "@tests/support/render";
import { navigation } from "@tests/support/navigation";
import { createTestWorld, registerAndLogin, type TestWorld } from "@tests/support/world";

const fillSignup = async (user: ReturnType<typeof userEvent.setup>, name: string, email: string, password: string) => {
  await user.type(screen.getByLabelText("Name:"), name);
  await user.type(screen.getByLabelText("Email:"), email);
  await user.type(screen.getByLabelText("Password:"), password);
  await user.click(screen.getByRole("button", { name: "Signup" }));
};

const fillLogin = async (user: ReturnType<typeof userEvent.setup>, email: string, password: string) => {
  await user.type(screen.getByLabelText("Email:"), email);
  await user.type(screen.getByLabelText("Password:"), password);
  await user.click(screen.getByRole("button", { name: "Login" }));
};

feature("Authentication screens", () => {
  let world: TestWorld;

  beforeEach(() => {
    world = createTestWorld();
  });

  afterEach(() => world.dispose());

  scenario("signup shows an error for every blank field", async () => {
    const user = userEvent.setup();
    renderWithApp(world, <SignupPage />);

    await when("the visitor submits an empty form", () =>
      user.click(screen.getByRole("button", { name: "Signup" })),
    );

    await thenExpect("each field shows its error", async () => {
      expect(await screen.findAllByText("This field cannot be blank")).toHaveLength(3);
    });
  });

  scenario("signup redirects to login on success", async () => {
    const user = userEvent.setup();
    renderWithApp(world, <SignupPage />);

    await when("the visitor submits valid details", () =>
      fillSignup(user, "Alice", "alice@example.com", "correct-horse"),
    );

    await thenExpect("they are sent to the login page", async () => {
      await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/user/login"));
    });
  });

  scenario("signup reports an email that is already in use", async () => {
    const user = userEvent.setup();
    await given("a registered user", () => registerAndLogin(world, "alice@example.com"));
    renderWithApp(world, <SignupPage />);

    await when("another visitor reuses the email", () =>
      fillSignup(user, "Mallory", "alice@example.com", "another-password"),
    );

    await thenExpect("the email error is displayed and no redirect happens", async () => {
      expect(await screen.findByText("Email address is already in use")).toBeInTheDocument();
      expect(navigation.push).not.toHaveBeenCalled();
    });
  });

  scenario("an unexpected failure during signup shows a friendly message", async () => {
    const user = userEvent.setup();
    const base = createInProcessGateways(world);
    renderWithApp(world, <SignupPage />, {
      identity: { ...base.identity, signup: async () => { throw new Error("boom"); } },
    });

    await when("the visitor submits valid details", () =>
      fillSignup(user, "Alice", "alice@example.com", "correct-horse"),
    );

    await thenExpect("a generic message is shown", async () => {
      expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
      expect(navigation.push).not.toHaveBeenCalled();
    });
  });

  scenario("the submit button is disabled while a request is in flight", async () => {
    const user = userEvent.setup();
    let release: () => void = () => {};
    const base = createInProcessGateways(world);
    renderWithApp(world, <SignupPage />, {
      identity: {
        ...base.identity,
        signup: () => new Promise<void>((resolve) => { release = resolve; }),
      },
    });

    await when("the visitor submits the form", () =>
      fillSignup(user, "Alice", "alice@example.com", "correct-horse"),
    );

    await thenExpect("the button is disabled until the request finishes", async () => {
      expect(screen.getByRole("button", { name: "Signup" })).toBeDisabled();
      release();
      await waitFor(() => expect(screen.getByRole("button", { name: "Signup" })).toBeEnabled());
    });
  });

  scenario("login with wrong credentials shows a generic error", async () => {
    const user = userEvent.setup();
    renderWithApp(world, <LoginPage />);

    await when("an unknown user logs in", () =>
      fillLogin(user, "ghost@example.com", "whatever-password"),
    );

    await thenExpect("the generic error is displayed", async () => {
      expect(await screen.findByText("Email or password is incorrect")).toBeInTheDocument();
    });
  });

  scenario("login reports blank and malformed fields", async () => {
    const user = userEvent.setup();
    renderWithApp(world, <LoginPage />);

    await when("the visitor types a malformed email and submits", async () => {
      await user.type(screen.getByLabelText("Email:"), "nope");
      await user.click(screen.getByRole("button", { name: "Login" }));
    });

    await thenExpect("each problem is shown next to its field", async () => {
      expect(await screen.findByText("This field must be a valid email address")).toBeInTheDocument();
      expect(screen.getByText("This field cannot be blank")).toBeInTheDocument();
    });
  });

  scenario("login redirects to the create page", async () => {
    const user = userEvent.setup();
    await world.modules.identity.signupUser.execute({
      name: "Alice",
      email: "alice@example.com",
      password: "correct-horse",
    });
    renderWithApp(world, <LoginPage />);

    await when("the user logs in", () => fillLogin(user, "alice@example.com", "correct-horse"));

    await thenExpect("they are sent to the create page", async () => {
      await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/snippet/create"));
    });
  });
});
