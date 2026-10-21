import { handle } from "@/bootstrap/handle-request";
import { view } from "@/modules/snippets/api/controller";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handle(request, ({ modules }) => view(modules.snippets, id));
}
