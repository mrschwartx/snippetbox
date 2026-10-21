import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = vi.hoisted(() => ({
  entries: new Map<string, { value: string; options: Record<string, unknown> }>(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const entry = cookieStore.entries.get(name);
      return entry ? { name, value: entry.value } : undefined;
    },
    set: (name: string, value: string, options: Record<string, unknown> = {}) => {
      cookieStore.entries.set(name, { value, options });
    },
    delete: (name: string) => {
      cookieStore.entries.delete(name);
    },
  }),
}));

import * as flashRoute from "@/app/api/flash/pop/route";
import { POST as login } from "@/app/api/login/route";
import { POST as logout } from "@/app/api/logout/route";
import { GET as me } from "@/app/api/me/route";
import { POST as signup } from "@/app/api/signup/route";
import { GET as snippetById } from "@/app/api/snippets/[id]/route";
import { GET as listSnippets, POST as createSnippet } from "@/app/api/snippets/route";
import { GET as ping } from "@/app/ping/route";
import { closeDatabase, getDatabase } from "@/bootstrap/database";

type Handler = (request: Request) => Promise<Response> | Response;

const request = (method: string, path: string, body?: unknown) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const flashPop = flashRoute.POST;

const call = async (handler: Handler, method: string, path: string, body?: unknown) => {
  const response = await handler(request(method, path, body));
  return { status: response.status, body: await response.json() };
};

const account = { name: "Alice", email: "alice@example.com", password: "correct-horse" };

const registerAndLogin = async () => {
  await call(signup, "POST", "/api/signup", account);
  await call(login, "POST", "/api/login", { email: account.email, password: account.password });
};

beforeEach(() => {
  process.env.DATABASE_PATH = ":memory:";
  delete process.env.COOKIE_SECURE;
  cookieStore.entries.clear();
  closeDatabase();
});

afterEach(() => {
  closeDatabase();
  delete process.env.DATABASE_PATH;
  delete process.env.COOKIE_SECURE;
  vi.restoreAllMocks();
});

describe("health", () => {
  it("answers OK as plain text", async () => {
    const response = ping();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(response.headers.get("content-type")).toContain("text/plain");
  });
});

describe("identity API", () => {
  it("reports no user to an anonymous visitor", async () => {
    expect(await call(me, "GET", "/api/me")).toEqual({ status: 200, body: { user: null } });
  });

  it("signs a user up and stores only a PBKDF2 hash", async () => {
    const result = await call(signup, "POST", "/api/signup", account);

    expect(result).toEqual({ status: 201, body: {} });
    const row = getDatabase().prepare("SELECT password_hash FROM users").get() as { password_hash: string };
    expect(row.password_hash.startsWith("pbkdf2$")).toBe(true);
    expect(row.password_hash).not.toContain(account.password);
  });

  it("rejects an invalid signup with field errors", async () => {
    const result = await call(signup, "POST", "/api/signup", { name: "", email: "x", password: "1" });

    expect(result.status).toBe(422);
    expect(result.body.error.code).toBe("VALIDATION");
    expect(Object.keys(result.body.error.fieldErrors)).toEqual(["name", "email", "password"]);
  });

  it("rejects a duplicate email with a field error", async () => {
    await call(signup, "POST", "/api/signup", account);
    const result = await call(signup, "POST", "/api/signup", { ...account, email: "ALICE@example.com" });

    expect(result.status).toBe(422);
    expect(result.body.error.fieldErrors.email).toBe("Email address is already in use");
  });

  it("logs in, sets a hardened session cookie and recognises the user afterwards", async () => {
    await call(signup, "POST", "/api/signup", account);
    const result = await call(login, "POST", "/api/login", {
      email: account.email,
      password: account.password,
    });

    expect(result).toEqual({ status: 200, body: { userId: 1 } });
    const session = cookieStore.entries.get("snippetbox_session");
    expect(session?.value).toMatch(/^[0-9a-f]{64}$/);
    expect(session?.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", secure: false });
    expect((session?.options.expires as Date).getTime()).toBeGreaterThan(Date.now());

    const current = await call(me, "GET", "/api/me");
    expect(current.body.user).toMatchObject({ id: 1, name: "Alice", email: "alice@example.com" });
    expect(current.body.user).not.toHaveProperty("passwordHash");
  });

  it("rejects wrong credentials with a generic message", async () => {
    await call(signup, "POST", "/api/signup", account);
    const result = await call(login, "POST", "/api/login", {
      email: account.email,
      password: "wrong-password",
    });

    expect(result.status).toBe(422);
    expect(result.body.error.nonFieldErrors).toEqual(["Email or password is incorrect"]);
    expect(cookieStore.entries.has("snippetbox_session")).toBe(false);
  });

  it("logs out by clearing the cookie and the stored session", async () => {
    await registerAndLogin();
    const result = await call(logout, "POST", "/api/logout");

    expect(result).toEqual({ status: 200, body: {} });
    expect(cookieStore.entries.has("snippetbox_session")).toBe(false);
    expect(getDatabase().prepare("SELECT COUNT(*) AS n FROM sessions").get()).toEqual({ n: 0 });
    expect((await call(me, "GET", "/api/me")).body.user).toBeNull();
  });

  it("marks cookies Secure when COOKIE_SECURE is true", async () => {
    process.env.COOKIE_SECURE = "true";
    await registerAndLogin();
    expect(cookieStore.entries.get("snippetbox_session")?.options.secure).toBe(true);
  });
});

describe("flash API", () => {
  it("delivers a message exactly once after signup", async () => {
    await call(signup, "POST", "/api/signup", account);

    expect((await call(flashPop, "POST", "/api/flash/pop")).body).toEqual({
      message: "Your signup was successful. Please log in.",
    });
    expect((await call(flashPop, "POST", "/api/flash/pop")).body).toEqual({ message: null });
  });

  it("expires the flash cookie after a minute", async () => {
    await call(signup, "POST", "/api/signup", account);
    expect(cookieStore.entries.get("snippetbox_flash")?.options).toMatchObject({
      maxAge: 60,
      httpOnly: true,
    });
  });

  it("does not expose a GET method", () => {
    expect("GET" in flashRoute).toBe(false);
  });
});

describe("snippets API", () => {
  const draft = { title: "Hello", content: "world", expires: 7 };

  it("starts with an empty list", async () => {
    expect(await call(listSnippets, "GET", "/api/snippets")).toEqual({ status: 200, body: [] });
  });

  it("refuses to create a snippet for an anonymous visitor", async () => {
    const result = await call(createSnippet, "POST", "/api/snippets", draft);
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("creates, lists and fetches a snippet for a logged in user", async () => {
    await registerAndLogin();

    const created = await call(createSnippet, "POST", "/api/snippets", draft);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ id: 1, title: "Hello", content: "world" });

    const list = await call(listSnippets, "GET", "/api/snippets");
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(1);

    const single = await snippetById(request("GET", "/api/snippets/1"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(single.status).toBe(200);
    expect((await single.json()).title).toBe("Hello");
  });

  it("reports validation errors per field", async () => {
    await registerAndLogin();
    const result = await call(createSnippet, "POST", "/api/snippets", { title: "", content: "", expires: 3 });

    expect(result.status).toBe(422);
    expect(Object.keys(result.body.error.fieldErrors)).toEqual(["title", "content", "expires"]);
  });

  it("treats a non numeric expiry as invalid", async () => {
    await registerAndLogin();
    const result = await call(createSnippet, "POST", "/api/snippets", { ...draft, expires: "7" });
    expect(result.body.error.fieldErrors.expires).toBe("This field must equal 1, 7 or 365");
  });

  it.each(["42", "abc", "0", "-1", "1.5", "1e3"])("returns 404 for snippet id %s", async (id) => {
    const response = await snippetById(request("GET", `/api/snippets/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NO_RECORD");
  });
});

describe("protocol errors", () => {
  it("requires a JSON content type on mutating routes", async () => {
    const response = await login(
      new Request("http://localhost/api/login", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(415);
  });

  it("rejects malformed JSON", async () => {
    const response = await signup(
      new Request("http://localhost/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{broken",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a JSON array body", async () => {
    expect((await call(signup, "POST", "/api/signup", [])).status).toBe(400);
  });

  it("hides internal failures behind a generic 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    getDatabase().exec("DROP TABLE sessions; DROP TABLE users;");

    const result = await call(signup, "POST", "/api/signup", account);

    expect(result.status).toBe(500);
    expect(result.body.error).toEqual({ code: "INTERNAL", message: "Internal server error" });
    expect(JSON.stringify(result.body)).not.toMatch(/no such table/);
    expect(spy).toHaveBeenCalled();
  });
});
