import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import CreateSnippetPage from "@/app/snippet/create/page";
import SnippetPage, { generateMetadata } from "@/app/snippet/view/[id]/page";
import { createUser, findUserByEmail, startSession } from "@/lib/auth";
import LoginPage, { metadata as loginMetadata } from "@/app/user/login/page";
import SignupPage, { metadata as signupMetadata } from "@/app/user/signup/page";
import { Flash } from "@/components/flash";
import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";
import { createSnippet } from "@/lib/snippets";
import { SnippetCard } from "@/components/snippet-card";
import { SnippetForm } from "@/components/snippet-form";
import { SnippetTable } from "@/components/snippet-table";
import { isNotFound, redirectTarget } from "../helpers/navigation";

const params = (id: string) => ({ params: Promise.resolve({ id }) });

function childrenOf(node: ReactNode): ReactNode[] {
  if (!isValidElement(node)) return [];
  const children = (node as ReactElement<{ children?: ReactNode }>).props.children;
  return Array.isArray(children) ? children : [children];
}

function findByType(node: ReactNode, type: unknown): ReactElement<Record<string, unknown>> | undefined {
  return childrenOf(node).find((child) => isValidElement(child) && child.type === type) as
    | ReactElement<Record<string, unknown>>
    | undefined;
}

describe("HomePage", () => {
  it("shows the empty state when there are no snippets", () => {
    const tree = HomePage();
    expect(findByType(tree, SnippetTable)).toBeUndefined();
    const paragraph = childrenOf(tree).find((child) => isValidElement(child) && child.type === "p") as ReactElement<{
      children: string;
    }>;
    expect(paragraph.props.children).toBe("There's nothing to see here... yet!");
  });

  it("passes the latest snippets to the table, newest first", () => {
    createSnippet("first", "c", 1);
    createSnippet("second", "c", 1);
    const table = findByType(HomePage(), SnippetTable);
    const snippets = table?.props.snippets as { title: string }[];
    expect(snippets.map((snippet) => snippet.title)).toEqual(["second", "first"]);
  });

  it("is rendered dynamically on every request", async () => {
    const home = await import("@/app/page");
    expect(home.dynamic).toBe("force-dynamic");
    expect(home.metadata.title).toEqual({ absolute: "Home - SnippetBox" });
  });
});

describe("SnippetPage", () => {
  it("renders the requested snippet", async () => {
    const id = createSnippet("Title", "Body", 1);
    const tree = await SnippetPage(params(String(id)));
    const card = findByType(tree, SnippetCard);
    expect(card?.props.snippet).toMatchObject({ id, title: "Title", content: "Body" });
  });

  it.each(["abc", "1abc", "-1", "1.5", "", " 1", "1 ", "0x10", "1e3"])("returns not found for the id %j", async (id) => {
    expect(await isNotFound(() => SnippetPage(params(id)))).toBe(true);
  });

  it("returns not found for an id that does not exist", async () => {
    expect(await isNotFound(() => SnippetPage(params("999")))).toBe(true);
  });

  it("returns not found for an expired snippet", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-22T00:00:00.000Z"));
    const id = createSnippet("t", "c", 1);
    vi.setSystemTime(new Date("2026-10-24T00:00:00.000Z"));
    expect(await isNotFound(() => SnippetPage(params(String(id))))).toBe(true);
  });

  it("builds the title from the id", async () => {
    expect(await generateMetadata(params("42"))).toEqual({ title: "Snippet #42" });
  });
});

describe("CreateSnippetPage", () => {
  it("redirects visitors to login", async () => {
    expect(await redirectTarget(() => CreateSnippetPage())).toBe("/user/login");
  });

  it("shows the form to signed in users", async () => {
    await createUser("Ada", "ada@example.com", "password123");
    await startSession(findUserByEmail("ada@example.com")!.id);
    const tree = await CreateSnippetPage();
    expect(isValidElement(tree) && tree.type).toBe(SnippetForm);
  });
});

describe("LoginPage", () => {
  it("renders the flash message area above the login form", () => {
    const tree = LoginPage();
    const types = childrenOf(tree).map((child) => (isValidElement(child) ? child.type : null));
    expect(types).toEqual([Flash, LoginForm]);
  });

  it("sets the page title", () => {
    expect(loginMetadata.title).toBe("Login");
  });
});

describe("SignupPage", () => {
  it("renders the signup form", () => {
    const tree = SignupPage();
    expect(isValidElement(tree) && tree.type).toBe(SignupForm);
  });

  it("sets the page title", () => {
    expect(signupMetadata.title).toBe("Signup");
  });
});
