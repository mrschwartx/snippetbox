import type { Clock } from "@/shared/kernel/clock";
import { UnauthenticatedError } from "@/shared/kernel/errors";
import { toSnippetDto, type SnippetDto } from "../domain/snippet";
import { publishSnippet, type SnippetDraft } from "../domain/snippet-draft";
import type { SnippetRepository } from "../domain/snippet-repository";
import type { Authenticator, Notifier } from "./ports";

export class CreateSnippet {
  constructor(
    private readonly snippets: SnippetRepository,
    private readonly authenticator: Authenticator,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
  ) {}

  async execute(draft: SnippetDraft): Promise<SnippetDto> {
    if (!(await this.authenticator.isAuthenticated())) {
      throw new UnauthenticatedError();
    }

    const newSnippet = publishSnippet(draft, this.clock.now());
    const snippet = await this.snippets.insert(newSnippet);

    await this.notifier.notify("Snippet successfully created!");
    return toSnippetDto(snippet);
  }
}
