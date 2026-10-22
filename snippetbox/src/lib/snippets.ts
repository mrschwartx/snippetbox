import { getDb } from "./db";

export interface Snippet {
  id: number;
  title: string;
  content: string;
  created: string;
  expires: string;
}

export function createSnippet(title: string, content: string, days: number) {
  const created = new Date();
  const expires = new Date(created.getTime() + days * 24 * 60 * 60 * 1000);
  const result = getDb()
    .prepare("INSERT INTO snippets (title, content, created, expires) VALUES (?, ?, ?, ?)")
    .run(title, content, created.toISOString(), expires.toISOString());
  return Number(result.lastInsertRowid);
}

export function getSnippet(id: number) {
  return getDb()
    .prepare("SELECT id, title, content, created, expires FROM snippets WHERE id = ? AND expires > ?")
    .get(id, new Date().toISOString()) as Snippet | undefined;
}

export function getLatestSnippets(limit = 10) {
  return getDb()
    .prepare(
      "SELECT id, title, content, created, expires FROM snippets WHERE expires > ? ORDER BY id DESC LIMIT ?",
    )
    .all(new Date().toISOString(), limit) as Snippet[];
}
