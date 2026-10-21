import { beforeEach, expect } from "vitest";
import { GetCurrentUser } from "@/modules/identity/application/get-current-user";
import { LoginUser } from "@/modules/identity/application/login-user";
import { LogoutUser } from "@/modules/identity/application/logout-user";
import { SessionManager } from "@/modules/identity/application/session-manager";
import { SignupUser } from "@/modules/identity/application/signup-user";
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

feature("Current user and logout", () => {
  let users: InMemoryUserRepository;
  let sessions: InMemorySessionRepository;
  let cookie: InMemorySessionCookie;
  let clock: FixedClock;
  let notifier: RecordingNotifier;
  let login: LoginUser;
  let logout: LogoutUser;
  let currentUser: GetCurrentUser;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    sessions = new InMemorySessionRepository();
    cookie = new InMemorySessionCookie();
    clock = new FixedClock();
    notifier = new RecordingNotifier();
    const hasher = new FakePasswordHasher();
    const manager = new SessionManager(sessions, new SequentialSessionTokens(), cookie, clock);
    login = new LoginUser(users, hasher, manager);
    logout = new LogoutUser(manager, notifier);
    currentUser = new GetCurrentUser(manager, users);
    await new SignupUser(users, hasher, notifier, clock).execute({ name: "Alice", ...credentials });
    notifier.messages.length = 0;
  });

  scenario("an anonymous visitor has no current user", async () => {
    await thenExpect("nobody is returned", async () => {
      expect(await currentUser.execute()).toBeNull();
    });
  });

  scenario("a logged in user is the current user without exposing the password hash", async () => {
    await given("a logged in user", () => login.execute(credentials));

    const profile = await when("the current user is requested", () => currentUser.execute());

    await thenExpect("a public profile is returned", () => {
      expect(profile).toEqual({
        id: 1,
        name: "Alice",
        email: "alice@example.com",
        created: "2026-10-15T08:00:00.000Z",
      });
    });
  });

  scenario("a session stays valid for eleven hours and ends after thirteen", async () => {
    await given("a logged in user", () => login.execute(credentials));

    await when("eleven hours pass", () => clock.advanceHours(11));
    await thenExpect("they are still logged in", async () => {
      expect(await currentUser.execute()).not.toBeNull();
    });

    await when("two more hours pass", () => clock.advanceHours(2));
    await thenExpect("they are logged out and the cookie is cleared", async () => {
      expect(await currentUser.execute()).toBeNull();
      expect(cookie.token).toBeUndefined();
    });
  });

  scenario("a session whose user no longer exists is discarded", async () => {
    await given("a logged in user who is then removed", async () => {
      await login.execute(credentials);
      users.remove(1);
    });

    await thenExpect("there is no current user and the session is cleaned up", async () => {
      expect(await currentUser.execute()).toBeNull();
      expect(sessions.count).toBe(0);
      expect(cookie.token).toBeUndefined();
    });
  });

  scenario("a user logs out", async () => {
    await given("a logged in user", () => login.execute(credentials));

    await when("they log out", () => logout.execute());

    await thenExpect("the session is gone and they are told", async () => {
      expect(await currentUser.execute()).toBeNull();
      expect(notifier.messages).toEqual(["You've been logged out successfully!"]);
    });
  });
});
