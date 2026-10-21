import { BadRequestError } from "./error-mapping";

export type RequestBody = Record<string, unknown>;

export const readJsonBody = async (request: Request): Promise<RequestBody> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new BadRequestError(415, "Content-Type must be application/json");
  }

  const text = await request.text();
  if (text === "") return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BadRequestError(400, "Body must be valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new BadRequestError(400, "Body must be a JSON object");
  }

  return parsed as RequestBody;
};

export const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

export const asNumber = (value: unknown): number =>
  typeof value === "number" ? value : Number.NaN;
