import { expect, type Page } from "@playwright/test";

export const PASSWORD = "password123";

let counter = 0;

export function unique(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newUser() {
  const id = unique("user");
  return { name: `User ${id}`, email: `${id}@example.com`, password: PASSWORD };
}

export async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
}

export async function signup(page: Page, user: { name: string; email: string; password: string }) {
  await open(page, "/user/signup");
  await page.getByLabel("Name:").fill(user.name);
  await page.getByLabel("Email:").fill(user.email);
  await page.getByLabel("Password:").fill(user.password);
  await page.getByRole("button", { name: "Signup" }).click();
  await expect(page).toHaveURL(/\/user\/login$/);
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await open(page, "/user/login");
  await page.getByLabel("Email:").fill(email);
  await page.getByLabel("Password:").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
}

export async function registerAndLogin(page: Page) {
  const user = newUser();
  await signup(page, user);
  await login(page, user.email, user.password);
  await expect(page).toHaveURL(/\/snippet\/create$/);
  return user;
}

export async function createSnippet(
  page: Page,
  snippet: { title: string; content: string; expires?: "One Year" | "One Week" | "One Day" },
) {
  await open(page, "/snippet/create");
  await page.getByLabel("Title:").fill(snippet.title);
  await page.getByLabel("Content:").fill(snippet.content);
  if (snippet.expires) await page.getByLabel(snippet.expires).check();
  await page.getByRole("button", { name: "Publish snippet" }).click();
  await expect(page).toHaveURL(/\/snippet\/view\/\d+$/);
}
