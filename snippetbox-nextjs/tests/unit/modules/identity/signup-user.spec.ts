import { beforeEach, expect } from "vitest";
import { SignupUser } from "@/modules/identity/application/signup-user";
import { ValidationError } from "@/shared/kernel/errors";
import { feature, given, scenario, thenExpect, when } from "@tests/support/bdd";
import {
  FakePasswordHasher,
  FixedClock,
  InMemoryUserRepository,
  RecordingNotifier,
} from "@tests/support/in-memory";

const input = { name: "  Alice  ", email: "Alice@Example.com", password: "correct-horse" };

feature("User signup", () => {
  let users: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let notifier: RecordingNotifier;
  let signup: SignupUser;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    notifier = new RecordingNotifier();
    signup = new SignupUser(users, hasher, notifier, new FixedClock());
  });

  scenario("a visitor signs up with valid details", async () => {
    await when("they submit the signup form", () => signup.execute(input));

    await thenExpect("the user is stored with normalised data and a hashed password", async () => {
      const stored = await users.findByEmail("alice@example.com");
      expect(stored?.name).toBe("Alice");
      expect(stored?.email).toBe("alice@example.com");
      expect(stored?.passwordHash).toBe("hashed:correct-horse");
      expect(stored?.created).toBe("2026-10-15T08:00:00.000Z");
    });

    await thenExpect("they are asked to log in", () => {
      expect(notifier.messages).toEqual(["Your signup was successful. Please log in."]);
    });
  });

  scenario("signup with invalid details is rejected before any work is done", async () => {
    const error = await when("they submit blank fields", () =>
      signup.execute({ name: "", email: "", password: "" }).catch((e: unknown) => e),
    );

    await thenExpect("every field reports an error", () => {
      expect(error).toBeInstanceOf(ValidationError);
      expect(Object.keys((error as ValidationError).fieldErrors)).toEqual([
        "name",
        "email",
        "password",
      ]);
    });

    await thenExpect("nothing is hashed, stored or announced", () => {
      expect(hasher.hashed).toEqual([]);
      expect(users.count).toBe(0);
      expect(notifier.messages).toEqual([]);
    });
  });

  scenario("signup with an email already in use is rejected", async () => {
    await given("a registered user", () => signup.execute(input));
    notifier.messages.length = 0;

    const error = await when("someone signs up with the same email in another case", () =>
      signup
        .execute({ name: "Mallory", email: "ALICE@example.com", password: "another-password" })
        .catch((e: unknown) => e),
    );

    await thenExpect("the email field reports it is taken and no message is sent", () => {
      expect((error as ValidationError).fieldErrors).toEqual({
        email: "Email address is already in use",
      });
      expect(users.count).toBe(1);
      expect(notifier.messages).toEqual([]);
    });
  });

  scenario("unexpected storage failures are not disguised", async () => {
    users.insert = async () => {
      throw new Error("disk full");
    };

    await thenExpect("the original error propagates", async () => {
      await expect(signup.execute(input)).rejects.toThrow("disk full");
    });
  });
});
