import type { FlashStore } from "./ports";

export class PopFlash {
  constructor(private readonly store: FlashStore) {}

  execute(): Promise<string | null> {
    return this.store.pop();
  }
}
