import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpFlashGateway } from "@/modules/flash/infrastructure/http-flash-gateway";
import { createHttpIdentityGateway } from "@/modules/identity/infrastructure/http-identity-gateway";
import { createHttpSnippetsGateway } from "@/modules/snippets/infrastructure/http-snippets-gateway";
import { toErrorResponse } from "@/shared/infrastructure/http/error-mapping";
import { httpRequest } from "@/shared/infrastructure/http/http-client";
import {
  RecordNotFoundError,
  ValidationError,
} from "@/shared/kernel/errors";

const stubFetch = (response: Response) => {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const lastCall = (fetchMock: ReturnType<typeof stubFetch>) => {
  const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { path, init, body: init.body ? JSON.parse(init.body as string) : undefined };
};

afterEach(() => vi.unstubAllGlobals());

describe("httpRequest", () => {
  it("sends JSON with same-origin credentials and no caching", async () => {
    const fetchMock = stubFetch(Response.json({ ok: true }));
    await httpRequest("POST", "/api/x", { a: 1 });

    const { init, body } = lastCall(fetchMock);
    expect(init.method).toBe("POST");
    expect(init.cache).toBe("no-store");
    expect(init.credentials).toBe("same-origin");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(body).toEqual({ a: 1 });
  });

  it("sends no body when none is given", async () => {
    const fetchMock = stubFetch(Response.json({}));
    await httpRequest("GET", "/api/x");
    expect(lastCall(fetchMock).init.body).toBeUndefined();
  });

  it("throws the domain error carried by a failed response", async () => {
    stubFetch(toErrorResponse(new ValidationError({ email: "taken" })));
    await expect(httpRequest("POST", "/api/x")).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws a generic error when a failed response is not JSON", async () => {
    stubFetch(new Response("<html>", { status: 502 }));
    await expect(httpRequest("GET", "/api/x")).rejects.toThrow("Request failed");
  });
});

describe("identity gateway", () => {
  it("unwraps the current user", async () => {
    const fetchMock = stubFetch(Response.json({ user: { id: 1 } }));
    expect(await createHttpIdentityGateway().currentUser()).toEqual({ id: 1 });
    expect(lastCall(fetchMock).path).toBe("/api/me");
  });

  it("returns null for an anonymous visitor", async () => {
    stubFetch(Response.json({ user: null }));
    expect(await createHttpIdentityGateway().currentUser()).toBeNull();
  });

  it.each([
    ["signup", "/api/signup", { name: "a", email: "b", password: "c" }],
    ["login", "/api/login", { email: "b", password: "c" }],
  ] as const)("posts %s credentials to %s", async (method, path, input) => {
    const fetchMock = stubFetch(Response.json({}, { status: 201 }));
    await createHttpIdentityGateway()[method](input as never);
    const call = lastCall(fetchMock);
    expect(call.path).toBe(path);
    expect(call.init.method).toBe("POST");
    expect(call.body).toEqual(input);
  });

  it("posts a logout", async () => {
    const fetchMock = stubFetch(Response.json({}));
    await createHttpIdentityGateway().logout();
    expect(lastCall(fetchMock).path).toBe("/api/logout");
  });
});

describe("snippets gateway", () => {
  const snippet = { id: 1, title: "t", content: "c", created: "x", expires: "y" };

  it("lists the latest snippets", async () => {
    const fetchMock = stubFetch(Response.json([snippet]));
    expect(await createHttpSnippetsGateway().listLatest()).toEqual([snippet]);
    expect(lastCall(fetchMock).path).toBe("/api/snippets");
  });

  it("creates a snippet from a draft", async () => {
    const fetchMock = stubFetch(Response.json(snippet, { status: 201 }));
    const draft = { title: "t", content: "c", expires: 7 };
    expect(await createHttpSnippetsGateway().create(draft)).toEqual(snippet);
    expect(lastCall(fetchMock).body).toEqual(draft);
  });

  it("fetches a snippet by id", async () => {
    const fetchMock = stubFetch(Response.json(snippet));
    await createHttpSnippetsGateway().get(12);
    expect(lastCall(fetchMock).path).toBe("/api/snippets/12");
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects id %s without calling the network", async (id) => {
    const fetchMock = stubFetch(Response.json({}));
    await expect(createHttpSnippetsGateway().get(id)).rejects.toBeInstanceOf(RecordNotFoundError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("flash gateway", () => {
  it("unwraps the popped message", async () => {
    const fetchMock = stubFetch(Response.json({ message: "hi" }));
    expect(await createHttpFlashGateway().pop()).toBe("hi");
    expect(lastCall(fetchMock).path).toBe("/api/flash/pop");
  });

  it("returns null when nothing is pending", async () => {
    stubFetch(Response.json({ message: null }));
    expect(await createHttpFlashGateway().pop()).toBeNull();
  });
});
