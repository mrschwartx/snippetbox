export type ErrorKind =
  | "validation"
  | "unauthenticated"
  | "not-found"
  | "conflict";

export abstract class DomainError extends Error {
  protected constructor(
    readonly kind: ErrorKind,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
