import { expect, test } from "@playwright/test";
import { publishSnippet, registerAndLogIn, uniqueTitle } from "./support";

test.describe("Feature: Snippets", () => {
  test("Scenario: a member publishes a snippet and sees it everywhere", async ({ page }) => {
    const title = uniqueTitle("Hello");
    await registerAndLogIn(page, "author");

    await test.step("When they publish a snippet that lives one week", async () => {
      await publishSnippet(page, { title, content: "console.log('hi')\nline two", expiry: "One Week" });
    });

    await test.step("Then they see it with a confirmation", async () => {
      await expect(page).toHaveURL(/\/snippet\/view\/\d+$/);
      await expect(page.getByRole("status")).toHaveText("Snippet successfully created!");
      await expect(page.getByText(title)).toBeVisible();
      await expect(page.locator("pre code")).toHaveText("console.log('hi')\nline two");
      await expect(page.getByText(/^Created: /)).toBeVisible();
      await expect(page.getByText(/^Expires: /)).toBeVisible();
    });

    await test.step("And it is listed on the home page", async () => {
      await page.goto("/");
      await expect(page.getByRole("link", { name: title })).toBeVisible();
      await page.getByRole("link", { name: title }).click();
      await expect(page.locator("pre code")).toContainText("console.log");
    });
  });

  test("Scenario: the expiry options default to one year", async ({ page }) => {
    await registerAndLogIn(page, "expiry");
    await page.goto("/snippet/create");

    await expect(page.getByLabel("One Year")).toBeChecked();
    await expect(page.getByLabel("One Week")).not.toBeChecked();
    await expect(page.getByLabel("One Day")).not.toBeChecked();
  });

  test("Scenario: an invalid snippet is explained field by field", async ({ page }) => {
    await registerAndLogIn(page, "invalid");
    await page.goto("/snippet/create");

    await page.getByLabel("Title:").fill("x".repeat(101));
    await page.getByRole("button", { name: "Publish snippet" }).click();

    await expect(page.getByText("This field cannot be more than 100 characters long")).toBeVisible();
    await expect(page.getByText("This field cannot be blank")).toBeVisible();
    await expect(page).toHaveURL(/\/snippet\/create$/);
  });

  test("Scenario: anyone can read a published snippet without logging in", async ({ page, browser }) => {
    const title = uniqueTitle("Public");
    await registerAndLogIn(page, "public");
    await publishSnippet(page, { title, content: "visible to all" });
    await expect(page).toHaveURL(/\/snippet\/view\/\d+$/);
    const address = page.url();

    const anonymous = await browser.newContext();
    const visitor = await anonymous.newPage();
    await visitor.goto(address);

    await expect(visitor.getByText(title)).toBeVisible();
    await expect(visitor.getByText("visible to all")).toBeVisible();
    await expect(visitor.getByRole("link", { name: "Login" })).toBeVisible();
    await anonymous.close();
  });

  test("Scenario: snippet content is shown as text and never executed", async ({ page }) => {
    const title = uniqueTitle("Markup");
    const payload = "<img src=x onerror=\"window.__pwned = true\"><script>window.__pwned = true</script>";
    await registerAndLogIn(page, "markup");

    await publishSnippet(page, { title, content: payload });

    await expect(page.locator("pre code")).toHaveText(payload);
    expect(await page.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned)).toBeUndefined();
  });

  test("Scenario: unknown and malformed snippet ids show not found", async ({ page }) => {
    for (const id of ["999999", "abc", "0"]) {
      await page.goto(`/snippet/view/${id}`);
      await expect(page.getByText("Not Found")).toBeVisible();
    }
  });

  test("Scenario: an unknown route shows not found", async ({ page }) => {
    await page.goto("/definitely/not/a/page");
    await expect(page.getByText("Not Found")).toBeVisible();
  });
});
