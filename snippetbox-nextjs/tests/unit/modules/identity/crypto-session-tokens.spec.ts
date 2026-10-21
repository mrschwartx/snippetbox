import { describe, expect, it } from "vitest";
import { CryptoSessionTokens } from "@/modules/identity/infrastructure/crypto-session-tokens";

describe("CryptoSessionTokens", () => {
  const tokens = new CryptoSessionTokens();

  it("generates 256 bit hex tokens", () => {
    expect(tokens.generate()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never generates the same token twice", () => {
    const generated = new Set(Array.from({ length: 200 }, () => tokens.generate()));
    expect(generated.size).toBe(200);
  });

  it("digests deterministically with SHA-256", () => {
    expect(tokens.digest("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(tokens.digest("abc")).toBe(tokens.digest("abc"));
  });

  it("never returns the token itself as its digest", () => {
    const token = tokens.generate();
    expect(tokens.digest(token)).not.toBe(token);
  });
});
