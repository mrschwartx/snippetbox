import { ValidationError } from "./errors";

export class Validator {
  readonly fieldErrors: Record<string, string> = {};

  get valid(): boolean {
    return Object.keys(this.fieldErrors).length === 0;
  }

  check(ok: boolean, key: string, message: string): void {
    if (!ok && !(key in this.fieldErrors)) {
      this.fieldErrors[key] = message;
    }
  }

  assertValid(): void {
    if (!this.valid) throw new ValidationError({ ...this.fieldErrors });
  }
}

export const notBlank = (value: string): boolean => value.trim() !== "";

export const maxChars = (value: string, limit: number): boolean =>
  Array.from(value).length <= limit;

export const minChars = (value: string, limit: number): boolean =>
  Array.from(value).length >= limit;

export const matches = (value: string, pattern: RegExp): boolean =>
  pattern.test(value);

export const permittedValue = <T>(value: T, permitted: readonly T[]): boolean =>
  permitted.includes(value);
