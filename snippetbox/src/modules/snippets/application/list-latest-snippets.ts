import type { Clock } from "@/shared/kernel/clock";
import {
  LATEST_SNIPPETS_LIMIT,
  toSnippetDto,
  type SnippetDto,
} from "../domain/snippet";
import type { SnippetRepository } from "../domain/snippet-repository";

export class ListLatestSnippets {
  constructor(
    private readonly snippets: SnippetRepository,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<SnippetDto[]> {
    const latest = await this.snippets.findLatestActive(
      this.clock.now(),
      LATEST_SNIPPETS_LIMIT,
    );
    return latest.map(toSnippetDto);
  }
}
