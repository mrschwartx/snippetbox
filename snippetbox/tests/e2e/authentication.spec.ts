import { expect, test } from "@playwright/test";
import { PASSWORD, logIn, registerAndLogIn, signUp, uniqueEmail } from "./support";

test.describe("Feature: Authentication", () => {
  test("Scenario: a visitor signs up, logs in and logs out", async ({ page }) => {
    const email = uniqueEmail("journey");

    await test.step("Given a visitor on the signup page", async () => {
      await page.goto("/user/signup");
      await expect(page.getByRole("link", { name: "Signup" })).toHaveClass(/live/);
    });

    await test.step("When they sign up with valid details", async () => {
      await signUp(page, "Journey User", email);
    });

    await test.step("Then they are asked to log in", async () => {
      await expect(page.getByRole("status")).toHaveText("Your signup was successful. Please log in.");
    });

    await test.step("When they log in", async () => {
      await logIn(page, email);
    });

    await test.step("Then they land on the create page as a member", async () => {
      await expect(page).toHaveURL(/\/snippet\/create$/);
      await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Create snippet" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Login" })).toHaveCount(0);
    });

    await test.step("When they log out", async () => {
      await page.getByRole("button", { name: "Logout" }).click();
    });

    await test.step("Then they are home again as a guest with a confirmation", async () => {
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("status")).toHaveText("You've been logged out successfully!");
      await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Logout" })).toHaveCount(0);
    });
  });

  test("Scenario: the session survives a page reload", async ({ page }) => {
    await registerAndLogIn(page, "reload");

    await page.reload();

    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  });

  test("Scenario: the session cookie is HttpOnly and not readable by scripts", async ({ page, context }) => {
    await registerAndLogIn(page, "cookie");

    const cookies = await context.cookies();
    const session = cookies.find((cookie) => cookie.name === "snippetbox_session");

    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");
    expect(session?.value).toMatch(/^[0-9a-f]{64}$/);
    expect(await page.evaluate(() => document.cookie)).not.toContain("snippetbox_session");
  });

  test("Scenario: signing up with blank fields shows an error for each field", async ({ page }) => {
    await page.goto("/user/signup");

    await page.getByRole("button", { name: "Signup" }).click();

    await expect(page.getByText("This field cannot be blank")).toHaveCount(3);
    await expect(page).toHaveURL(/\/user\/signup$/);
  });

  test("Scenario: signing up with a short password and bad email is explained", async ({ page }) => {
    await page.goto("/user/signup");
    await page.getByLabel("Name:").fill("Short");
    await page.getByLabel("Email:").fill("not-an-email");
    await page.getByLabel("Password:").fill("1234567");

    await page.getByRole("button", { name: "Signup" }).click();

    await expect(page.getByText("This field must be a valid email address")).toBeVisible();
    await expect(page.getByText("This field must be at least 8 characters long")).toBeVisible();
  });

  test("Scenario: signing up with an email already in use is rejected", async ({ page }) => {
    const email = uniqueEmail("dupe");
    await signUp(page, "First", email);

    await page.goto("/user/signup");
    await page.getByLabel("Name:").fill("Second");
    await page.getByLabel("Email:").fill(email.toUpperCase());
    await page.getByLabel("Password:").fill(PASSWORD);
    await page.getByRole("button", { name: "Signup" }).click();

    await expect(page.getByText("Email address is already in use")).toBeVisible();
  });

  test("Scenario: a wrong password gets the same message as an unknown email", async ({ page }) => {
    const email = uniqueEmail("wrong");
    await signUp(page, "Wrong", email);

    await logIn(page, email, "definitely-not-it");
    await expect(page.getByText("Email or password is incorrect")).toBeVisible();

    await page.reload();
    await logIn(page, uniqueEmail("ghost"), PASSWORD);
    await expect(page.getByText("Email or password is incorrect")).toBeVisible();
    await expect(page.getByRole("button", { name: "Logout" })).toHaveCount(0);
  });

  test("Scenario: an anonymous visitor is redirected away from the create page", async ({ page }) => {
    await page.goto("/snippet/create");

    await expect(page).toHaveURL(/\/user\/login$/);
    await expect(page.getByRole("button", { name: "Publish snippet" })).toHaveCount(0);
  });

  test("Scenario: logging out invalidates the session on the server", async ({ page, request, context }) => {
    await registerAndLogIn(page, "invalidate");
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((cookie) => cookie.name === "snippetbox_session");
    expect(sessionCookie).toBeDefined();

    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();

    const replay = await request.get("/api/me", {
      headers: { Cookie: `snippetbox_session=${sessionCookie?.value}` },
    });
    expect((await replay.json()).user).toBeNull();
  });
});
