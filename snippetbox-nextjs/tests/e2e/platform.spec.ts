import { expect, test } from "@playwright/test";
import { PASSWORD, uniqueEmail } from "./support";

test.describe("Feature: Platform", () => {
  test("Scenario: the health check answers OK", async ({ request }) => {
    const response = await request.get("/ping");

    expect(response.status()).toBe(200);
    expect(await response.text()).toBe("OK");
  });

  test("Scenario: responses carry hardened security headers", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();

    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("origin-when-cross-origin");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("Scenario: the pages render without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    for (const path of ["/", "/user/login", "/user/signup", "/snippet/create"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }

    expect(errors).toEqual([]);
  });

  test("Scenario: the header and footer are present on every page", async ({ page }) => {
    await page.goto("/user/login");

    await expect(page.getByRole("link", { name: "Snippetbox" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Next.js" })).toBeVisible();
    await expect(page).toHaveTitle("Login - Snippetbox");
  });
});

test.describe("Feature: HTTP API contract", () => {
  const json = { "Content-Type": "application/json" };

  test("Scenario: mutating routes demand a JSON content type", async ({ request }) => {
    const response = await request.post("/api/login", {
      headers: { "Content-Type": "text/plain" },
      data: "{}",
    });

    expect(response.status()).toBe(415);
  });

  test("Scenario: malformed JSON is a bad request", async ({ request }) => {
    const response = await request.post("/api/signup", { headers: json, data: "{oops" });

    expect(response.status()).toBe(400);
    expect((await response.json()).error.code).toBe("BAD_REQUEST");
  });

  test("Scenario: creating a snippet without a session is unauthorised", async ({ request }) => {
    const response = await request.post("/api/snippets", {
      headers: json,
      data: { title: "t", content: "c", expires: 1 },
    });

    expect(response.status()).toBe(401);
  });

  test("Scenario: the full API flow works over plain HTTP", async ({ request }) => {
    const email = uniqueEmail("api");

    const signup = await request.post("/api/signup", {
      headers: json,
      data: { name: "Api", email, password: PASSWORD },
    });
    expect(signup.status()).toBe(201);

    const login = await request.post("/api/login", { headers: json, data: { email, password: PASSWORD } });
    expect(login.status()).toBe(200);

    const me = await request.get("/api/me");
    expect((await me.json()).user.email).toBe(email);

    const created = await request.post("/api/snippets", {
      headers: json,
      data: { title: "From API", content: "body", expires: 1 },
    });
    expect(created.status()).toBe(201);
    const snippet = await created.json();

    const fetched = await request.get(`/api/snippets/${snippet.id}`);
    expect((await fetched.json()).title).toBe("From API");

    const missing = await request.get("/api/snippets/not-a-number");
    expect(missing.status()).toBe(404);
  });
});
