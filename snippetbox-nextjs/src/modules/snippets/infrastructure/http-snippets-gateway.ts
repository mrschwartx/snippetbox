import { httpRequest } from "@/shared/infrastructure/http/http-client";
import { RecordNotFoundError } from "@/shared/kernel/errors";
import type { SnippetsGateway } from "../application/snippets-gateway";
import type { SnippetDto } from "../domain/snippet";

export const createHttpSnippetsGateway = (): SnippetsGateway => ({
  listLatest: () => httpRequest<SnippetDto[]>("GET", "/api/snippets"),
  get: (id) => {
    if (!Number.isInteger(id) || id < 1) {
      return Promise.reject(new RecordNotFoundError());
    }
    return httpRequest<SnippetDto>("GET", `/api/snippets/${id}`);
  },
  create: (draft) => httpRequest<SnippetDto>("POST", "/api/snippets", draft),
});
