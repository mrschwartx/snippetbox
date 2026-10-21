import type { PasswordHasher } from "../application/ports";

const ALGORITHM = "pbkdf2";
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const derive = async (
  plain: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> => {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(plain),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    KEY_BITS,
  );
  return new Uint8Array(bits);
};

const constantTimeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
};

export class WebCryptoPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const derived = await derive(plain, salt, ITERATIONS);
    return [ALGORITHM, ITERATIONS, toBase64(salt), toBase64(derived)].join("$");
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    const [algorithm, iterations, salt, expected] = hash.split("$");
    if (algorithm !== ALGORITHM || !iterations || !salt || !expected) {
      return false;
    }

    const derived = await derive(plain, fromBase64(salt), Number(iterations));
    return constantTimeEqual(derived, fromBase64(expected));
  }
}
