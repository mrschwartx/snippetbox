export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export interface SessionTokens {
  generate(): string;
  digest(token: string): string;
}

export interface SessionCookie {
  read(): Promise<string | undefined>;
  write(token: string, expiresAt: Date): Promise<void>;
  clear(): Promise<void>;
}

export interface Notifier {
  notify(message: string): Promise<void>;
}
