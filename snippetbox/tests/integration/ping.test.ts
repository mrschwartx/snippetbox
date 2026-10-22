import { describe, expect, it } from "vitest";
import { GET, dynamic } from "@/app/ping/route";

describe("GET /ping", () => {
  it("answers OK as plain text", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  });

  it("is statically generated", () => {
    expect(dynamic).toBe("force-static");
  });
});
