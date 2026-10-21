import { expect, type Page } from "@playwright/test";

export const PASSWORD = "correct-horse-battery";

export type Expiry = "One Day" | "One Week" | "One Year";

export const uniqueEmail = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

export const uniqueTitle = (label: string): string =>
  `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const signUp = async (
  page: Page,
  name: string,
  email: string,
  password = PASSWORD,
): Promise<void> => {
  await page.goto("/user/signup");
  await page.getByLabel("Name:").fill(name);
  await page.getByLabel("Email:").fill(email);
  await page.getByLabel("Password:").fill(password);
  await page.getByRole("button", { name: "Signup" }).click();
  await expect(page).toHaveURL(/\/user\/login$/);
};

export const logIn = async (
  page: Page,
  email: string,
  password = PASSWORD,
): Promise<void> => {
  await page.getByLabel("Email:").fill(email);
  await page.getByLabel("Password:").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
};

export const registerAndLogIn = async (
  page: Page,
  label = "member",
): Promise<string> => {
  const email = uniqueEmail(label);
  await signUp(page, "Test Member", email);
  await logIn(page, email);
  await expect(page).toHaveURL(/\/snippet\/create$/);
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  return email;
};

export interface SnippetInput {
  title: string;
  content: string;
  expiry?: Expiry;
}

export const publishSnippet = async (
  page: Page,
  { title, content, expiry }: SnippetInput,
): Promise<void> => {
  await page.goto("/snippet/create");
  await page.getByLabel("Title:").fill(title);
  await page.getByLabel("Content:").fill(content);
  if (expiry) await page.getByLabel(expiry).check();
  await page.getByRole("button", { name: "Publish snippet" }).click();
};
