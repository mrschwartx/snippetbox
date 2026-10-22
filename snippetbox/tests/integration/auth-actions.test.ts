import { describe, expect, it } from "vitest";
import { loginAction, logoutAction, signupAction } from "@/actions/auth";
import { checkCredentials, findUserByEmail, getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { FLASH_COOKIE } from "@/lib/flash";
import { initialFormState } from "@/lib/form";
import { cookieJar } from "../helpers/cookie-jar";
import { formData } from "../helpers/forms";
import { redirectTarget } from "../helpers/navigation";

const validSignup = { name: "Ada Lovelace", email: "ada@example.com", password: "password123" };

const signup = (fields: Record<string, string>) => signupAction(initialFormState, formData(fields));
const login = (fields: Record<string, string>) => loginAction(initialFormState, formData(fields));
const userCount = () => (getDb().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;

describe("signupAction", () => {
  it("creates the user, flashes a message and redirects to login", async () => {
    const target = await redirectTarget(() => signup(validSignup));
    expect(target).toBe("/user/login");
    expect(findUserByEmail("ada@example.com")).toMatchObject({ name: "Ada Lovelace" });
    expect(cookieJar.get(FLASH_COOKIE)?.value).toBe("Your signup was successful. Please log in.");
  });

  it("does not sign the new user in", async () => {
    await redirectTarget(() => signup(validSignup));
    expect(await getCurrentUser()).toBeNull();
  });

  it("allows the new user to log in afterwards", async () => {
    await redirectTarget(() => signup(validSignup));
    expect(await checkCredentials("ada@example.com", "password123")).not.toBeNull();
  });

  it("reports every blank field", async () => {
    const state = await signup({ name: "", email: "", password: "" });
    expect(state.errors).toEqual({
      name: "This field cannot be blank",
      email: "This field cannot be blank",
      password: "This field cannot be blank",
    });
    expect(userCount()).toBe(0);
  });

  it("treats whitespace only input as blank", async () => {
    const state = await signup({ name: "   ", email: "   ", password: "        " });
    expect(Object.keys(state.errors).sort()).toEqual(["email", "name", "password"]);
  });

  it("treats missing form fields as blank", async () => {
    const state = await signupAction(initialFormState, new FormData());
    expect(Object.keys(state.errors).sort()).toEqual(["email", "name", "password"]);
  });

  it.each(["plain", "no-at.example.com", "a@b", "a b@example.com", "@example.com", "a@@example.com", "a@example."])(
    "rejects the invalid email %s",
    async (email) => {
      const state = await signup({ ...validSignup, email });
      expect(state.errors.email).toBe("This field must be a valid email address");
      expect(userCount()).toBe(0);
    },
  );

  it("rejects passwords shorter than eight characters", async () => {
    const state = await signup({ ...validSignup, password: "1234567" });
    expect(state.errors.password).toBe("This field must be at least 8 characters long");
  });

  it("accepts a password of exactly eight characters", async () => {
    expect(await redirectTarget(() => signup({ ...validSignup, password: "12345678" }))).toBe("/user/login");
  });

  it("rejects an email that is already registered", async () => {
    await redirectTarget(() => signup(validSignup));
    const state = await signup({ ...validSignup, name: "Someone Else" });
    expect(state.errors.email).toBe("Email address is already in use");
    expect(userCount()).toBe(1);
  });

  it("detects duplicates case insensitively", async () => {
    await redirectTarget(() => signup(validSignup));
    const state = await signup({ ...validSignup, email: "ADA@EXAMPLE.COM" });
    expect(state.errors.email).toBe("Email address is already in use");
  });

  it("never echoes the password back and keeps the other values", async () => {
    const state = await signup({ name: "Ada", email: "bad", password: "short" });
    expect(state.values).toEqual({ name: "Ada", email: "bad", password: "" });
  });

  it("does not set a flash when validation fails", async () => {
    await signup({ name: "", email: "", password: "" });
    expect(cookieJar.has(FLASH_COOKIE)).toBe(false);
  });

  it("stores the password only as a hash", async () => {
    await redirectTarget(() => signup(validSignup));
    const row = getDb().prepare("SELECT password_hash FROM users").get() as { password_hash: string };
    expect(row.password_hash).not.toContain("password123");
  });

  it("stores names with markup unchanged", async () => {
    await redirectTarget(() => signup({ ...validSignup, name: "<b>Ada</b>" }));
    expect(findUserByEmail("ada@example.com")?.name).toBe("<b>Ada</b>");
  });
});

describe("loginAction", () => {
  const register = () => redirectTarget(() => signup(validSignup));

  it("starts a session and redirects to the create page", async () => {
    await register();
    cookieJar.clear();
    const target = await redirectTarget(() => login({ email: "ada@example.com", password: "password123" }));
    expect(target).toBe("/snippet/create");
    expect(await getCurrentUser()).toMatchObject({ email: "ada@example.com" });
  });

  it("accepts a differently cased email", async () => {
    await register();
    const target = await redirectTarget(() => login({ email: "ADA@Example.com", password: "password123" }));
    expect(target).toBe("/snippet/create");
  });

  it("reports blank fields without touching credentials", async () => {
    const state = await login({ email: "", password: "" });
    expect(state.errors).toEqual({
      email: "This field cannot be blank",
      password: "This field cannot be blank",
    });
    expect(state.formError).toBeUndefined();
  });

  it("rejects an invalid email format", async () => {
    const state = await login({ email: "not-an-email", password: "password123" });
    expect(state.errors.email).toBe("This field must be a valid email address");
  });

  it("rejects an email padded with spaces as invalid", async () => {
    const state = await login({ email: " ada@example.com ", password: "password123" });
    expect(state.errors.email).toBe("This field must be a valid email address");
  });

  it("returns a generic error for a wrong password", async () => {
    await register();
    const state = await login({ email: "ada@example.com", password: "wrong-password" });
    expect(state.formError).toBe("Email or password is incorrect");
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns the same generic error for an unknown email", async () => {
    const state = await login({ email: "ghost@example.com", password: "password123" });
    expect(state.formError).toBe("Email or password is incorrect");
  });

  it("keeps the email but never the password after a failure", async () => {
    const state = await login({ email: "ghost@example.com", password: "password123" });
    expect(state.values).toEqual({ email: "ghost@example.com", password: "" });
  });

  it("does not create a session on failure", async () => {
    await login({ email: "ghost@example.com", password: "password123" });
    expect((getDb().prepare("SELECT COUNT(*) AS n FROM sessions").get() as { n: number }).n).toBe(0);
  });
});

describe("logoutAction", () => {
  it("ends the session, flashes and redirects home", async () => {
    await redirectTarget(() => signup(validSignup));
    await redirectTarget(() => login({ email: "ada@example.com", password: "password123" }));
    expect(await getCurrentUser()).not.toBeNull();

    const target = await redirectTarget(() => logoutAction());
    expect(target).toBe("/");
    expect(await getCurrentUser()).toBeNull();
    expect(cookieJar.get(FLASH_COOKIE)?.value).toBe("You've been logged out successfully!");
  });

  it("still redirects when nobody is signed in", async () => {
    expect(await redirectTarget(() => logoutAction())).toBe("/");
  });
});
