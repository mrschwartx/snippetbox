export interface FlashGateway {
  pop(): Promise<string | null>;
}
