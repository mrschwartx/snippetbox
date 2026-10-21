import { DomainError } from "@/shared/kernel/domain-error";

export class DuplicateEmailError extends DomainError {
  constructor() {
    super("conflict", "DUPLICATE_EMAIL", "Duplicate email");
  }
}
