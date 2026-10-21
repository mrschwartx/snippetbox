import { handle } from "@/bootstrap/handle-request";
import { create, listLatest } from "@/modules/snippets/api/controller";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handle(request, ({ modules }) => listLatest(modules.snippets));
}

export function POST(request: Request) {
  return handle(
    request,
    ({ modules, body }) => create(modules.snippets, body),
    201,
  );
}
