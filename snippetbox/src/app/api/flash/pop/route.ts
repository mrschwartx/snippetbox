import { handle } from "@/bootstrap/handle-request";
import { pop } from "@/modules/flash/api/controller";

export function POST(request: Request) {
  return handle(request, ({ modules }) => pop(modules.flash));
}
