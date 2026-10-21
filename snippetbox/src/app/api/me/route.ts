import { handle } from "@/bootstrap/handle-request";
import { currentUser } from "@/modules/identity/api/controller";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handle(request, ({ modules }) => currentUser(modules.identity));
}
