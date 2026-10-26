import { expect, test } from "@playwright/test";

test.describe("health and basics", () => {
  test("GET /ping answers OK as plain text", async ({ request }) => {
    const response = await request.get("/ping");
    expect(response.status()).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(response.headers()["content-type"]).toContain("text/plain");
  });

  test("does not advertise the framework", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["x-powered-by"]).toBeUndefined();
  });

  test("home page has the site chrome", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Home - SnippetBox");
    await expect(page.getByRole("heading", { name: "SnippetBox", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Latest Snippets" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("Powered by Next.js");
  });

  test("unknown routes render the not found page", async ({ page }) => {
    const response = await page.goto("/does/not/exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Not Found")).toBeVisible();
  });

  test("visitors see signup and login but not create or logout", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Signup" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Login" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Create snippet" })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: "Logout" })).toHaveCount(0);
  });

  test("the current page is highlighted in the navigation", async ({ page }) => {
    await page.goto("/user/login");
    await expect(page.getByRole("navigation").getByRole("link", { name: "Login" })).toHaveClass(/live/);
    await expect(page.getByRole("navigation").getByRole("link", { name: "Home" })).not.toHaveClass(/live/);
  });
});
