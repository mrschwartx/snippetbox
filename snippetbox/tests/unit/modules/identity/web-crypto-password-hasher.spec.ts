import { describe, expect, it } from "vitest";
import { WebCryptoPasswordHasher } from "@/modules/identity/infrastructure/web-crypto-password-hasher";

describe("WebCryptoPasswordHasher", () => {
  const hasher = new WebCryptoPasswordHasher();

  it("verifies the original password", async () => {
    const hash = await hasher.hash("correct-horse");
    expect(await hasher.verify("correct-horse", hash)).toBe(true);
  });

  it("rejects a different password", async () => {
    const hash = await hasher.hash("correct-horse");
    expect(await hasher.verify("battery-staple", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    const [a, b] = await Promise.all([hasher.hash("same"), hasher.hash("same")]);
    expect(a).not.toBe(b);
  });

  it("does not store the plain password", async () => {
    expect(await hasher.hash("correct-horse")).not.toContain("correct-horse");
  });

  it("encodes algorithm, iterations, salt and digest", async () => {
    const [algorithm, iterations, salt, digest] = (await hasher.hash("x")).split("$");
    expect(algorithm).toBe("pbkdf2");
    expect(Number(iterations)).toBeGreaterThanOrEqual(210_000);
    expect(salt).toBeTruthy();
    expect(digest).toBeTruthy();
  });

  it("rejects malformed or foreign hashes", async () => {
    expect(await hasher.verify("x", "garbage")).toBe(false);
    expect(await hasher.verify("x", "bcrypt$1$a$b")).toBe(false);
    expect(await hasher.verify("x", "pbkdf2$$a$b")).toBe(false);
  });
});
