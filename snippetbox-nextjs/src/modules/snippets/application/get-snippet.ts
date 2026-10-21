import type { Clock } from "@/shared/kernel/clock";
import { RecordNotFoundError } from "@/shared/kernel/errors";
import { toSnippetDto, type SnippetDto } from "../domain/snippet";
import type { SnippetRepository } from "../domain/snippet-repository";

export class GetSnippet {
  constructor(
    private readonly snippets: SnippetRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: number): Promise<SnippetDto> {
    if (!Number.isInteger(id) || id < 1) throw new RecordNotFoundError();

    const snippet = await this.snippets.findById(id);
    if (!snippet || snippet.isExpiredAt(this.clock.now())) {
      throw new RecordNotFoundError();
    }

    return toSnippetDto(snippet);
  }
}
