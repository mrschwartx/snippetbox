import { afterEach, beforeEach, expect } from "vitest";
import { ValidationError } from "@/shared/kernel/errors";
import { feature, given, scenario, thenExpect, when } from "@tests/support/bdd";
import { createTestWorld, type TestWorld } from "@tests/support/world";

const credentials = { email: "alice@example.com", password: "correct-horse" };

feature("User authentication with real persistence", () => {
  let world: TestWorld;

  beforeEach(() => {
    world = createTestWorld();
  });

  afterEach(() => world.dispose());

  scenario("a visitor signs up and is asked to log in", async () => {
    await when("the visitor signs up with valid details", () =>
      world.modules.identity.signupUser.execute({ name: "Alice", ...credentials }),
    );

    await thenExpect("a flash message asks them to log in", async () => {
      expect(await world.modules.flash.popFlash.execute()).toBe(
        "Your signup was successful. Please log in.",
      );
    });

    await thenExpect("the stored password is not the plain password", () => {
      const row = world.database.prepare("SELECT password_hash FROM users").get() as {
        password_hash: string;
      };
      expect(row.password_hash).toBe("hashed:correct-horse");
    });
  });

  scenario("signup with an email already in use is rejected in any case", async () => {
    await given("a registered user", () =>
      world.modules.identity.signupUser.execute({ name: "Alice", ...credentials }),
    );

    const error = await when("another visitor signs up with the same email in capitals", () =>
      world.modules.identity.signupUser
        .execute({ name: "Mallory", email: "ALICE@EXAMPLE.COM", password: "another-password" })
        .catch((e: unknown) => e),
    );

    await thenExpect("the email field reports it is in use", () => {
      expect((error as ValidationError).fieldErrors.email).toBe("Email address is already in use");
    });
  });

  scenario("a registered user logs in and is recognised on the next request", async () => {
    await given("a registered user", () =>
      world.modules.identity.signupUser.execute({ name: "Alice", ...credentials }),
    );

    await when("they log in with the right credentials", () =>
      world.modules.identity.loginUser.execute(credentials),
    );

    await thenExpect("they are the current user", async () => {
      expect((await world.modules.identity.getCurrentUser.execute())?.name).toBe("Alice");
    });

    await thenExpect("the session cookie is not the token stored in the database", async () => {
      const token = await world.cookies.get("snippetbox_session");
      const rows = world.database.prepare("SELECT token_hash FROM sessions").all();
      expect(rows).toHaveLength(1);
      expect(rows).not.toContainEqual({ token_hash: token });
    });
  });

  scenario("logging in twice leaves a single session", async () => {
    await given("a registered user who logged in", async () => {
      await world.modules.identity.signupUser.execute({ name: "Alice", ...credentials });
      await world.modules.identity.loginUser.execute(credentials);
    });

    await when("they log in again", () => world.modules.identity.loginUser.execute(credentials));

    await thenExpect("only one session is stored", () => {
      expect(world.database.prepare("SELECT COUNT(*) AS n FROM sessions").get()).toEqual({ n: 1 });
    });
  });

  scenario("a wrong password and an unknown email are indistinguishable", async () => {
    await given("a registered user", () =>
      world.modules.identity.signupUser.execute({ name: "Alice", ...credentials }),
    );

    const wrongPassword = await when("they use a wrong password", () =>
      world.modules.identity.loginUser
        .execute({ ...credentials, password: "wrong-password" })
        .catch((e: unknown) => e),
    );
    const unknownEmail = await when("an unknown email logs in", () =>
      world.modules.identity.loginUser
        .execute({ ...credentials, email: "ghost@example.com" })
        .catch((e: unknown) => e),
    );

    await thenExpect("both get the same generic error and stay anonymous", async () => {
      expect((wrongPassword as ValidationError).nonFieldErrors).toEqual(["Email or password is incorrect"]);
      expect((unknownEmail as ValidationError).nonFieldErrors).toEqual(["Email or password is incorrect"]);
      expect(await world.modules.identity.getCurrentUser.execute()).toBeNull();
    });
  });

  scenario("a session expires after twelve hours", async () => {
    await given("a logged in user", async () => {
      await world.modules.identity.signupUser.execute({ name: "Alice", ...credentials });
      await world.modules.identity.loginUser.execute(credentials);
    });

    await when("eleven hours pass", () => world.clock.advanceHours(11));
    await thenExpect("they are still logged in", async () => {
      expect(await world.modules.identity.getCurrentUser.execute()).not.toBeNull();
    });

    await when("two more hours pass", () => world.clock.advanceHours(2));
    await thenExpect("they are logged out and the stored session is removed", async () => {
      expect(await world.modules.identity.getCurrentUser.execute()).toBeNull();
      expect(world.database.prepare("SELECT COUNT(*) AS n FROM sessions").get()).toEqual({ n: 0 });
    });
  });

  scenario("a user logs out", async () => {
    await given("a logged in user", async () => {
      await world.modules.identity.signupUser.execute({ name: "Alice", ...credentials });
      await world.modules.identity.loginUser.execute(credentials);
      await world.modules.flash.popFlash.execute();
    });

    await when("they log out", () => world.modules.identity.logoutUser.execute());

    await thenExpect("the session is gone and a flash message is shown once", async () => {
      expect(await world.modules.identity.getCurrentUser.execute()).toBeNull();
      expect(await world.modules.flash.popFlash.execute()).toBe(
        "You've been logged out successfully!",
      );
      expect(await world.modules.flash.popFlash.execute()).toBeNull();
    });
  });
});
