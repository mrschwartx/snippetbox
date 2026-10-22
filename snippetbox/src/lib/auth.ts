import { cookies } from "next/headers";
import { createHash, pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { promisify } from "node:util";
import { cookieOptions } from "./config";
import { getDb } from "./db";

const derive = promisify(pbkdf2);

const SESSION_COOKIE = "snippetbox_session";
const SESSION_HOURS = 12;
const ITERATIONS = 210_000;

export interface User {
  id: number;
  name: string;
  email: string;
}

interface UserRow extends User {
  password_hash: string;
}

export async function hashPassword(plain: string) {
  const salt = randomBytes(16);
  const hash = await derive(plain, salt, ITERATIONS, 32, "sha256");
  return ["pbkdf2", ITERATIONS, salt.toString("base64"), hash.toString("base64")].join("$");
}

async function verifyPassword(plain: string, stored: string) {
  const [algorithm, iterations, salt, expected] = stored.split("$");
  if (algorithm !== "pbkdf2" || !iterations || !salt || !expected) return false;

  const expectedBytes = Buffer.from(expected, "base64");
  const hash = await derive(
    plain,
    Buffer.from(salt, "base64"),
    Number(iterations),
    expectedBytes.length,
    "sha256",
  );
  return timingSafeEqual(hash, expectedBytes);
}

let decoyHash: Promise<string> | undefined;

export function findUserByEmail(email: string) {
  return getDb()
    .prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as UserRow | undefined;
}

export async function createUser(name: string, email: string, password: string) {
  getDb()
    .prepare("INSERT INTO users (name, email, password_hash, created) VALUES (?, ?, ?, ?)")
    .run(name.trim(), email.trim().toLowerCase(), await hashPassword(password), new Date().toISOString());
}

export async function checkCredentials(email: string, password: string) {
  const user = findUserByEmail(email);
  decoyHash ??= hashPassword("snippetbox-timing-decoy");
  const valid = await verifyPassword(password, user ? user.password_hash : await decoyHash);
  return user && valid ? user : null;
}

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function startSession(userId: number) {
  const db = getDb();
  const jar = await cookies();
  const previous = jar.get(SESSION_COOKIE)?.value;
  if (previous) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(digest(previous));
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
    digest(token),
    userId,
    expires.toISOString(),
  );
  jar.set(SESSION_COOKIE, token, { ...cookieOptions(), expires });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return;
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(digest(token));
  jar.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const user = getDb()
    .prepare(
      `SELECT users.id, users.name, users.email
       FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    )
    .get(digest(token), new Date().toISOString()) as User | undefined;

  return user ?? null;
});
