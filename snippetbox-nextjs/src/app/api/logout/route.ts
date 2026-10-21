import { handle } from "@/bootstrap/handle-request";
import { logout } from "@/modules/identity/api/controller";

export function POST(request: Request) {
  return handle(request, ({ modules }) => logout(modules.identity));
}
