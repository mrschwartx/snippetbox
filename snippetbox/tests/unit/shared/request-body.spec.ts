import { describe, expect, it } from "vitest";
import { BadRequestError } from "@/shared/infrastructure/http/error-mapping";
import {
  asNumber,
  asString,
  readJsonBody,
} from "@/shared/infrastructure/http/request-body";

const post = (body: string | undefined, contentType: string | null = "application/json") =>
  new Request("http://localhost/api/x", {
    method: "POST",
    headers: contentType ? { "Content-Type": contentType } : {},
    body,
  });

describe("readJsonBody", () => {
  it("parses a JSON object", async () => {
    expect(await readJsonBody(post('{"a":1}'))).toEqual({ a: 1 });
  });

  it("accepts a content type with parameters and any casing", async () => {
    expect(await readJsonBody(post("{}", "Application/JSON; charset=utf-8"))).toEqual({});
  });

  it("treats an empty body as an empty object", async () => {
    expect(await readJsonBody(post(""))).toEqual({});
  });

  it("rejects a missing or wrong content type with 415", async () => {
    for (const type of [null, "text/plain", "application/x-www-form-urlencoded"]) {
      const error = await readJsonBody(post("{}", type)).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(BadRequestError);
      expect((error as BadRequestError).status).toBe(415);
    }
  });

  it("rejects malformed JSON with 400", async () => {
    const error = await readJsonBody(post("{nope")).catch((e: unknown) => e);
    expect((error as BadRequestError).status).toBe(400);
    expect((error as BadRequestError).message).toBe("Body must be valid JSON");
  });

  it.each(["[]", "null", "42", '"text"', "true"])("rejects %s as a body", async (body) => {
    const error = await readJsonBody(post(body)).catch((e: unknown) => e);
    expect((error as BadRequestError).message).toBe("Body must be a JSON object");
  });
});

describe("value coercion", () => {
  it("asString returns strings and empties everything else", () => {
    expect(asString("x")).toBe("x");
    expect([1, null, undefined, {}, []].map(asString)).toEqual(["", "", "", "", ""]);
  });

  it("asNumber returns numbers and NaN for everything else", () => {
    expect(asNumber(7)).toBe(7);
    expect(asNumber("7")).toBeNaN();
    expect(asNumber(null)).toBeNaN();
  });
});
