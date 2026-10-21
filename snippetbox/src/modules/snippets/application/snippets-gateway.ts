import type { SnippetDto } from "../domain/snippet";
import type { SnippetDraft } from "../domain/snippet-draft";

export interface SnippetsGateway {
  listLatest(): Promise<SnippetDto[]>;
  get(id: number): Promise<SnippetDto>;
  create(draft: SnippetDraft): Promise<SnippetDto>;
}
