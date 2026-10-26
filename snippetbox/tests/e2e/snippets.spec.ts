import { expect, test } from "@playwright/test";
import { createSnippet, open, registerAndLogin, unique } from "./helpers";

test.describe("access control", () => {
  test("redirects visitors from the create page to login", async ({ page }) => {
    await page.goto("/snippet/create");
    await expect(page).toHaveURL(/\/user\/login$/);
  });
});

test.describe("creating snippets", () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
  });

  test("shows the form with one year preselected", async ({ page }) => {
    await expect(page.getByLabel("Title:")).toBeVisible();
    await expect(page.getByLabel("Content:")).toBeVisible();
    await expect(page.getByLabel("One Year")).toBeChecked();
    await expect(page.getByLabel("One Week")).not.toBeChecked();
    await expect(page.getByLabel("One Day")).not.toBeChecked();
  });

  test("reports blank title and content", async ({ page }) => {
    await page.getByRole("button", { name: "Publish snippet" }).click();
    await expect(page.getByText("This field cannot be blank")).toHaveCount(2);
  });

  test("rejects a title over one hundred characters and keeps the input", async ({ page }) => {
    await page.getByLabel("Title:").fill("x".repeat(101));
    await page.getByLabel("Content:").fill("body text");
    await page.getByLabel("One Week").check();
    await page.getByRole("button", { name: "Publish snippet" }).click();

    await expect(page.getByText("This field cannot be more than 100 characters long")).toBeVisible();
    await expect(page.getByLabel("Content:")).toHaveValue("body text");
    await expect(page.getByLabel("One Week")).toBeChecked();
  });

  test("accepts a title of exactly one hundred characters", async ({ page }) => {
    await createSnippet(page, { title: "y".repeat(100), content: "body" });
  });

  test("publishes a snippet, shows a flash and the snippet details", async ({ page }) => {
    const title = unique("Haiku");
    await createSnippet(page, { title, content: "line one\nline two\n    indented", expires: "One Week" });

    await expect(page).toHaveTitle(/^Snippet #\d+ - SnippetBox$/);
    await expect(page.getByRole("status")).toHaveText("Snippet successfully created!");
    await expect(page.locator(".snippet strong")).toHaveText(title);
    await expect(page.locator(".snippet pre code")).toHaveText("line one\nline two\n    indented");
    await expect(page.getByText(/^Created: \d{2} \w{3} \d{4} at \d{2}:\d{2}$/)).toBeVisible();
    await expect(page.getByText(/^Expires: \d{2} \w{3} \d{4} at \d{2}:\d{2}$/)).toBeVisible();
  });

  test("the flash disappears after reloading the snippet", async ({ page }) => {
    await createSnippet(page, { title: unique("Flash"), content: "c" });
    await expect(page.getByRole("status")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("expiry differs by the chosen duration", async ({ page }) => {
    const readSpan = async () => {
      const created = await page.locator("time").first().getAttribute("datetime");
      const expires = await page.locator("time").nth(1).getAttribute("datetime");
      return (new Date(expires!).getTime() - new Date(created!).getTime()) / 86_400_000;
    };

    await createSnippet(page, { title: unique("Day"), content: "c", expires: "One Day" });
    expect(await readSpan()).toBe(1);
    await createSnippet(page, { title: unique("Week"), content: "c", expires: "One Week" });
    expect(await readSpan()).toBe(7);
    await createSnippet(page, { title: unique("Year"), content: "c", expires: "One Year" });
    expect(await readSpan()).toBe(365);
  });

  test("escapes HTML in titles and content", async ({ page }) => {
    const title = `<img src=x onerror=window.__xss=1> ${unique("xss")}`;
    await createSnippet(page, { title, content: "<script>window.__xss=1</script><b>bold</b>" });

    await expect(page.locator(".snippet strong")).toHaveText(title);
    await expect(page.locator(".snippet pre code")).toHaveText("<script>window.__xss=1</script><b>bold</b>");
    await expect(page.locator(".snippet img")).toHaveCount(0);
    await expect(page.locator(".snippet b")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });

  test("stores quotes and SQL metacharacters literally", async ({ page }) => {
    const title = `Robert'); DROP TABLE snippets;-- ${unique("sql")}`;
    await createSnippet(page, { title, content: "' OR '1'='1" });
    await expect(page.locator(".snippet strong")).toHaveText(title);
    await open(page, "/");
    await expect(page.getByRole("link", { name: title })).toBeVisible();
  });

  test("keeps unicode content intact", async ({ page }) => {
    const title = `日本語 ✓ ${unique("uni")}`;
    await createSnippet(page, { title, content: "🙂 ünïcödé" });
    await expect(page.locator(".snippet pre code")).toHaveText("🙂 ünïcödé");
  });
});

test.describe("browsing snippets", () => {
  test("a new snippet appears at the top of the home page and links to its page", async ({ page }) => {
    await registerAndLogin(page);
    const title = unique("Listed");
    await createSnippet(page, { title, content: "listed body" });
    const viewUrl = page.url();

    await open(page, "/");
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow.getByRole("link", { name: title })).toBeVisible();
    await expect(firstRow.locator("td").nth(1)).toHaveText(/^\d{2} \w{3} \d{4} at \d{2}:\d{2}$/);
    await expect(firstRow.locator("td").nth(2)).toHaveText(/^#\d+$/);

    await firstRow.getByRole("link", { name: title }).click();
    await expect(page).toHaveURL(viewUrl);
    await expect(page.locator(".snippet pre code")).toHaveText("listed body");
  });

  test("the home page lists at most ten snippets, newest first", async ({ page }) => {
    await registerAndLogin(page);
    const titles: string[] = [];
    for (let index = 0; index < 11; index += 1) {
      const title = unique(`Bulk${index}`);
      titles.push(title);
      await createSnippet(page, { title, content: "c" });
    }
    await open(page, "/");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(10);
    await expect(rows.first().getByRole("link")).toHaveText(titles[10]);
    await expect(rows.nth(9).getByRole("link")).toHaveText(titles[1]);
    await expect(page.getByRole("link", { name: titles[0], exact: true })).toHaveCount(0);
  });

  test("snippets are public to anonymous visitors", async ({ page, browser }) => {
    await registerAndLogin(page);
    await createSnippet(page, { title: unique("Public"), content: "everyone can read" });
    const url = page.url();

    const anonymous = await browser.newContext();
    const anonymousPage = await anonymous.newPage();
    await anonymousPage.goto(url);
    await expect(anonymousPage.locator(".snippet pre code")).toHaveText("everyone can read");
    await expect(anonymousPage.getByRole("status")).toHaveCount(0);
    await anonymous.close();
  });

  test("unknown ids return 404", async ({ page }) => {
    const response = await page.goto("/snippet/view/99999999");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Not Found")).toBeVisible();
  });

  for (const id of ["abc", "-1", "1.5", "0x10", "1e3"]) {
    test(`a non numeric id (${id}) returns 404`, async ({ page }) => {
      const response = await page.goto(`/snippet/view/${id}`);
      expect(response?.status()).toBe(404);
    });
  }
});

test.describe("full user journey", () => {
  test("signup, login, publish, view, logout", async ({ page }) => {
    const { email } = await registerAndLogin(page);
    expect(email).toContain("@example.com");

    const title = unique("Journey");
    await createSnippet(page, { title, content: "end to end", expires: "One Day" });
    await expect(page.locator(".snippet strong")).toHaveText(title);

    await page.getByRole("link", { name: "Home" }).click();
    await expect(page.getByRole("link", { name: title })).toBeVisible();

    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page.getByRole("status")).toHaveText("You've been logged out successfully!");
    await expect(page.getByRole("link", { name: title })).toBeVisible();
  });
});
