import {
  asNumber,
  asString,
  type RequestBody,
} from "@/shared/infrastructure/http/request-body";
import type { SnippetsModule } from "../module";

export const listLatest = (snippets: SnippetsModule) =>
  snippets.listLatestSnippets.execute();

export const create = (snippets: SnippetsModule, body: RequestBody) =>
  snippets.createSnippet.execute({
    title: asString(body.title),
    content: asString(body.content),
    expires: asNumber(body.expires),
  });

export const view = (snippets: SnippetsModule, rawId: string) => {
  const id = /^\d+$/.test(rawId) ? Number(rawId) : Number.NaN;
  return snippets.getSnippet.execute(id);
};
