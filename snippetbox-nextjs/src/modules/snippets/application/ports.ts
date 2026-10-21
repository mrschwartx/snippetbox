export interface Authenticator {
  isAuthenticated(): Promise<boolean>;
}

export interface Notifier {
  notify(message: string): Promise<void>;
}
