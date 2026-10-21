import type { SqliteDatabase } from "@/shared/infrastructure/sqlite/sqlite-database";
import type { Clock } from "@/shared/kernel/clock";
import { CreateSnippet } from "./application/create-snippet";
import { GetSnippet } from "./application/get-snippet";
import { ListLatestSnippets } from "./application/list-latest-snippets";
import type { Authenticator, Notifier } from "./application/ports";
import { SqliteSnippetRepository } from "./infrastructure/sqlite-snippet-repository";

export interface SnippetsDependencies {
  database: SqliteDatabase;
  clock: Clock;
  authenticator: Authenticator;
  notifier: Notifier;
}

export interface SnippetsModule {
  createSnippet: CreateSnippet;
  getSnippet: GetSnippet;
  listLatestSnippets: ListLatestSnippets;
}

export const createSnippetsModule = ({
  database,
  clock,
  authenticator,
  notifier,
}: SnippetsDependencies): SnippetsModule => {
  const snippets = new SqliteSnippetRepository(database);

  return {
    createSnippet: new CreateSnippet(snippets, authenticator, notifier, clock),
    getSnippet: new GetSnippet(snippets, clock),
    listLatestSnippets: new ListLatestSnippets(snippets, clock),
  };
};
