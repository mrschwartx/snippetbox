import { DomainError } from "./domain-error";

export class ValidationError extends DomainError {
  constructor(
    readonly fieldErrors: Record<string, string>,
    readonly nonFieldErrors: string[] = [],
  ) {
    super("validation", "VALIDATION", "Validation failed");
  }
}

export class UnauthenticatedError extends DomainError {
  constructor() {
    super("unauthenticated", "UNAUTHENTICATED", "Authentication required");
  }
}

export class RecordNotFoundError extends DomainError {
  constructor() {
    super("not-found", "NO_RECORD", "No matching record found");
  }
}
