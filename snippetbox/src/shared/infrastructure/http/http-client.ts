import { fromErrorBody } from "./error-mapping";

type Method = "GET" | "POST";

export const httpRequest = async <T>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> => {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw fromErrorBody(payload);
  return payload as T;
};
