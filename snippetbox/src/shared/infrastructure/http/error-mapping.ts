import { DomainError, type ErrorKind } from "@/shared/kernel/domain-error";
import {
  RecordNotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "@/shared/kernel/errors";

export class BadRequestError extends Error {
  constructor(
    readonly status: 400 | 415 = 400,
    message = "Bad request",
  ) {
    super(message);
    this.name = "BadRequestError";
  }
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
    nonFieldErrors?: string[];
  };
}

const STATUS_BY_KIND: Record<ErrorKind, number> = {
  validation: 422,
  unauthenticated: 401,
  "not-found": 404,
  conflict: 409,
};

const errorResponse = (body: ErrorBody, status: number): Response =>
  Response.json(body, { status });

export const toErrorResponse = (error: unknown): Response => {
  if (error instanceof ValidationError) {
    return errorResponse(
      {
        error: {
          code: error.code,
          message: error.message,
          fieldErrors: error.fieldErrors,
          nonFieldErrors: error.nonFieldErrors,
        },
      },
      STATUS_BY_KIND[error.kind],
    );
  }

  if (error instanceof BadRequestError) {
    return errorResponse(
      { error: { code: "BAD_REQUEST", message: error.message } },
      error.status,
    );
  }

  if (error instanceof DomainError) {
    return errorResponse(
      { error: { code: error.code, message: error.message } },
      STATUS_BY_KIND[error.kind],
    );
  }

  console.error(error);
  return errorResponse(
    { error: { code: "INTERNAL", message: "Internal server error" } },
    500,
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const fromErrorBody = (body: unknown): Error => {
  const error = isRecord(body) && isRecord(body.error) ? body.error : {};
  const message =
    typeof error.message === "string" ? error.message : "Request failed";

  switch (error.code) {
    case "VALIDATION":
      return new ValidationError(
        isRecord(error.fieldErrors)
          ? (error.fieldErrors as Record<string, string>)
          : {},
        Array.isArray(error.nonFieldErrors)
          ? (error.nonFieldErrors as string[])
          : [],
      );
    case "UNAUTHENTICATED":
      return new UnauthenticatedError();
    case "NO_RECORD":
      return new RecordNotFoundError();
    default:
      return new Error(message);
  }
};
