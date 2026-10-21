import type { NewSnippet, Snippet } from "./snippet";

export interface SnippetRepository {
  insert(snippet: NewSnippet): Promise<Snippet>;
  findById(id: number): Promise<Snippet | null>;
  findLatestActive(now: Date, limit: number): Promise<Snippet[]>;
}
