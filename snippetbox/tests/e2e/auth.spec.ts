import { expect, test } from "@playwright/test";
import { login, newUser, open, PASSWORD, registerAndLogin, signup } from "./helpers";

test.describe("signup", () => {
  test("shows a title and the expected fields", async ({ page }) => {
    await open(page, "/user/signup");
    await expect(page).toHaveTitle("Signup - SnippetBox");
    await expect(page.getByLabel("Name:")).toBeVisible();
    await expect(page.getByLabel("Email:")).toBeVisible();
    await expect(page.getByLabel("Password:")).toBeVisible();
  });

  test("reports blank fields", async ({ page }) => {
    await open(page, "/user/signup");
    await page.getByRole("button", { name: "Signup" }).click();
    await expect(page.getByText("This field cannot be blank")).toHaveCount(3);
  });

  test("reports a short password and keeps the typed name and email", async ({ page }) => {
    const user = newUser();
    await open(page, "/user/signup");
    await page.getByLabel("Name:").fill(user.name);
    await page.getByLabel("Email:").fill(user.email);
    await page.getByLabel("Password:").fill("short");
    await page.getByRole("button", { name: "Signup" }).click();

    await expect(page.getByText("This field must be at least 8 characters long")).toBeVisible();
    await expect(page.getByLabel("Name:")).toHaveValue(user.name);
    await expect(page.getByLabel("Email:")).toHaveValue(user.email);
    await expect(page.getByLabel("Password:")).toHaveValue("");
  });

  test("reports an invalid email", async ({ page }) => {
    await open(page, "/user/signup");
    await page.getByLabel("Name:").fill("Someone");
    await page.getByLabel("Email:").fill("a@b");
    await page.getByLabel("Password:").fill(PASSWORD);
    await page.getByRole("button", { name: "Signup" }).click();
    await expect(page.getByText("This field must be a valid email address")).toBeVisible();
  });

  test("creates an account and shows a flash on the login page", async ({ page }) => {
    await signup(page, newUser());
    await expect(page.getByRole("status")).toHaveText("Your signup was successful. Please log in.");
  });

  test("the flash disappears after a reload", async ({ page }) => {
    await signup(page, newUser());
    await expect(page.getByRole("status")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("rejects an email that is already registered, ignoring case", async ({ page }) => {
    const user = newUser();
    await signup(page, user);
    await open(page, "/user/signup");
    await page.getByLabel("Name:").fill("Copycat");
    await page.getByLabel("Email:").fill(user.email.toUpperCase());
    await page.getByLabel("Password:").fill(PASSWORD);
    await page.getByRole("button", { name: "Signup" }).click();
    await expect(page.getByText("Email address is already in use")).toBeVisible();
  });
});

test.describe("login", () => {
  test("shows a title and the expected fields", async ({ page }) => {
    await open(page, "/user/login");
    await expect(page).toHaveTitle("Login - SnippetBox");
    await expect(page.getByLabel("Email:")).toBeVisible();
    await expect(page.getByLabel("Password:")).toBeVisible();
  });

  test("reports blank fields", async ({ page }) => {
    await open(page, "/user/login");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText("This field cannot be blank")).toHaveCount(2);
  });

  test("rejects a wrong password with a generic message", async ({ page }) => {
    const user = newUser();
    await signup(page, user);
    await login(page, user.email, "wrong-password");
    await expect(page.getByText("Email or password is incorrect")).toBeVisible();
    await expect(page).toHaveURL(/\/user\/login$/);
    await expect(page.getByLabel("Email:")).toHaveValue(user.email);
    await expect(page.getByLabel("Password:")).toHaveValue("");
  });

  test("rejects an unknown email with the same generic message", async ({ page }) => {
    await login(page, `ghost-${Date.now()}@example.com`);
    await expect(page.getByText("Email or password is incorrect")).toBeVisible();
  });

  test("signs in and lands on the create snippet page", async ({ page }) => {
    await registerAndLogin(page);
    await expect(page).toHaveTitle("Create a New Snippet - SnippetBox");
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Create snippet" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Logout" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Login" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Signup" })).toHaveCount(0);
  });

  test("accepts a differently cased email", async ({ page }) => {
    const user = newUser();
    await signup(page, user);
    await login(page, user.email.toUpperCase());
    await expect(page).toHaveURL(/\/snippet\/create$/);
  });

  test("sets an httpOnly session cookie", async ({ page, context }) => {
    await registerAndLogin(page);
    const cookies = await context.cookies();
    const session = cookies.find((cookie) => cookie.name === "snippetbox_session");
    expect(session).toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");
    expect(session?.value).toMatch(/^[0-9a-f]{64}$/);
    expect(await page.evaluate(() => document.cookie)).not.toContain("snippetbox_session");
  });

  test("stays signed in across reloads and new pages", async ({ page }) => {
    await registerAndLogin(page);
    await page.reload();
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
    await open(page, "/");
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  });

  test("does not share a session between browser contexts", async ({ page, browser }) => {
    await registerAndLogin(page);
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await otherPage.goto("/snippet/create");
    await expect(otherPage).toHaveURL(/\/user\/login$/);
    await other.close();
  });

  test("rejects a forged session cookie", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "snippetbox_session", value: "a".repeat(64), url: baseURL as string }]);
    await page.goto("/snippet/create");
    await expect(page).toHaveURL(/\/user\/login$/);
  });
});

test.describe("logout", () => {
  test("ends the session and flashes a goodbye", async ({ page }) => {
    await registerAndLogin(page);
    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("status")).toHaveText("You've been logged out successfully!");
    await expect(page.getByRole("navigation").getByRole("link", { name: "Login" })).toBeVisible();
  });

  test("blocks the create page afterwards", async ({ page }) => {
    await registerAndLogin(page);
    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/snippet/create");
    await expect(page).toHaveURL(/\/user\/login$/);
  });

  test("invalidates the old session cookie on the server", async ({ page, context, baseURL }) => {
    await registerAndLogin(page);
    const stolen = (await context.cookies()).find((cookie) => cookie.name === "snippetbox_session")!;
    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page).toHaveURL(/\/$/);

    await context.clearCookies();
    await context.addCookies([{ name: stolen.name, value: stolen.value, url: baseURL as string }]);
    await page.goto("/snippet/create");
    await expect(page).toHaveURL(/\/user\/login$/);
  });
});
