import type { FlashStore } from "./ports";

export class PushFlash {
  constructor(private readonly store: FlashStore) {}

  execute(message: string): Promise<void> {
    return this.store.push(message);
  }
}
