export interface FlashStore {
  push(message: string): Promise<void>;
  pop(): Promise<string | null>;
}
