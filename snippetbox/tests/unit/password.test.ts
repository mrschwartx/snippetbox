import { describe, expect, it } from "vitest";
import { hashPassword } from "@/lib/auth";

describe("hashPassword", () => {
  it("produces a pbkdf2 record with four segments", async () => {
    const [algorithm, iterations, salt, hash] = (await hashPassword("correct horse")).split("$");
    expect(algorithm).toBe("pbkdf2");
    expect(Number(iterations)).toBeGreaterThanOrEqual(210_000);
    expect(Buffer.from(salt, "base64")).toHaveLength(16);
    expect(Buffer.from(hash, "base64")).toHaveLength(32);
  });

  it("never contains the plain text password", async () => {
    expect(await hashPassword("super-secret-password")).not.toContain("super-secret-password");
  });

  it("salts every hash differently", async () => {
    const [first, second] = await Promise.all([hashPassword("same"), hashPassword("same")]);
    expect(first).not.toBe(second);
  });

  it("hashes unicode passwords", async () => {
    expect(await hashPassword("pässwörd-密码-🔑")).toMatch(/^pbkdf2\$\d+\$/);
  });
});
