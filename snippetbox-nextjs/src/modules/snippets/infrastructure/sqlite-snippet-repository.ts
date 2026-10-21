import type { SqliteDatabase } from "@/shared/infrastructure/sqlite/sqlite-database";
import { Snippet, type NewSnippet } from "../domain/snippet";
import type { SnippetRepository } from "../domain/snippet-repository";

interface SnippetRow {
  id: number;
  title: string;
  content: string;
  created: string;
  expires: string;
}

const SELECT_SNIPPET = "SELECT id, title, content, created, expires FROM snippets";

const toSnippet = (row: SnippetRow): Snippet =>
  Snippet.restore({
    id: row.id,
    title: row.title,
    content: row.content,
    created: new Date(row.created),
    expires: new Date(row.expires),
  });

export class SqliteSnippetRepository implements SnippetRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async insert(snippet: NewSnippet): Promise<Snippet> {
    const result = this.database
      .prepare(
        "INSERT INTO snippets (title, content, created, expires) VALUES (?, ?, ?, ?)",
      )
      .run(
        snippet.title,
        snippet.content,
        snippet.created.toISOString(),
        snippet.expires.toISOString(),
      );

    return Snippet.restore({ id: Number(result.lastInsertRowid), ...snippet });
  }

  async findById(id: number): Promise<Snippet | null> {
    const row = this.database
      .prepare(`${SELECT_SNIPPET} WHERE id = ?`)
      .get(id) as SnippetRow | undefined;

    return row ? toSnippet(row) : null;
  }

  async findLatestActive(now: Date, limit: number): Promise<Snippet[]> {
    const rows = this.database
      .prepare(`${SELECT_SNIPPET} WHERE expires > ? ORDER BY id DESC LIMIT ?`)
      .all(now.toISOString(), limit) as SnippetRow[];

    return rows.map(toSnippet);
  }
}
