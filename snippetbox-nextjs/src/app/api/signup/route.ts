import { handle } from "@/bootstrap/handle-request";
import { signup } from "@/modules/identity/api/controller";

export function POST(request: Request) {
  return handle(
    request,
    ({ modules, body }) => signup(modules.identity, body),
    201,
  );
}
