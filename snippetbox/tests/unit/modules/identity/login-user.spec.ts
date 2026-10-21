import { beforeEach, expect } from "vitest";
import { LoginUser } from "@/modules/identity/application/login-user";
import { SessionManager } from "@/modules/identity/application/session-manager";
import { SignupUser } from "@/modules/identity/application/signup-user";
import { ValidationError } from "@/shared/kernel/errors";
import { feature, given, scenario, thenExpect, when } from "@tests/support/bdd";
import {
  FakePasswordHasher,
  FixedClock,
  InMemorySessionCookie,
  InMemorySessionRepository,
  InMemoryUserRepository,
  RecordingNotifier,
  SequentialSessionTokens,
} from "@tests/support/in-memory";

const credentials = { email: "alice@example.com", password: "correct-horse" };
const GENERIC_ERROR = ["Email or password is incorrect"];

feature("User login", () => {
  let users: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let cookie: InMemorySessionCookie;
  let sessions: InMemorySessionRepository;
  let login: LoginUser;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    cookie = new InMemorySessionCookie();
    sessions = new InMemorySessionRepository();
    const clock = new FixedClock();
    login = new LoginUser(
      users,
      hasher,
      new SessionManager(sessions, new SequentialSessionTokens(), cookie, clock),
    );
    await new SignupUser(users, hasher, new RecordingNotifier(), clock).execute({
      name: "Alice",
      ...credentials,
    });
    hasher.hashed.length = 0;
  });

  scenario("a registered user logs in", async () => {
    const userId = await when("they submit the right credentials", () => login.execute(credentials));

    await thenExpect("the user id is returned and a session is started", () => {
      expect(userId).toBe(1);
      expect(sessions.count).toBe(1);
      expect(cookie.token).toBe("token-1");
    });
  });

  scenario("the email is matched regardless of case", async () => {
    await when("they log in with the email written in another case", () =>
      login.execute({ ...credentials, email: "ALICE@Example.com" }),
    );

    await thenExpect("a session is started", () => {
      expect(sessions.count).toBe(1);
    });
  });

  scenario("a wrong password is rejected with a generic error", async () => {
    const error = await when("they use a wrong password", () =>
      login.execute({ ...credentials, password: "wrong-password" }).catch((e: unknown) => e),
    );

    await thenExpect("a non field error is reported and no session starts", () => {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).nonFieldErrors).toEqual(GENERIC_ERROR);
      expect((error as ValidationError).fieldErrors).toEqual({});
      expect(sessions.count).toBe(0);
    });
  });

  scenario("an unknown email gets exactly the same error", async () => {
    const error = await when("an unknown email logs in", () =>
      login.execute({ ...credentials, email: "ghost@example.com" }).catch((e: unknown) => e),
    );

    await thenExpect("the generic error is reported", () => {
      expect((error as ValidationError).nonFieldErrors).toEqual(GENERIC_ERROR);
    });
  });

  scenario("an unknown email still costs a password verification", async () => {
    await given("no verification has happened yet", () => {
      hasher.verified.length = 0;
    });

    await when("an unknown email logs in", () =>
      login.execute({ ...credentials, email: "ghost@example.com" }).catch(() => undefined),
    );

    await thenExpect("a hash was still verified so response time does not reveal the account", () => {
      expect(hasher.verified).toHaveLength(1);
    });
  });

  scenario("malformed input is rejected before touching the user store", async () => {
    const error = await when("they submit blank credentials", () =>
      login.execute({ email: "", password: "" }).catch((e: unknown) => e),
    );

    await thenExpect("field errors are reported and no hash is verified", () => {
      expect(Object.keys((error as ValidationError).fieldErrors)).toEqual(["email", "password"]);
      expect(hasher.verified).toEqual([]);
    });
  });
});
