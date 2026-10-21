import { handle } from "@/bootstrap/handle-request";
import { login } from "@/modules/identity/api/controller";

export function POST(request: Request) {
  return handle(request, ({ modules, body }) => login(modules.identity, body));
}
