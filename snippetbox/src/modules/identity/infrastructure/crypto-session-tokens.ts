import { createHash, randomBytes } from "node:crypto";
import type { SessionTokens } from "../application/ports";

const TOKEN_BYTES = 32;

export class CryptoSessionTokens implements SessionTokens {
  generate(): string {
    return randomBytes(TOKEN_BYTES).toString("hex");
  }

  digest(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
