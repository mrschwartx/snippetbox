import { httpRequest } from "@/shared/infrastructure/http/http-client";
import type { FlashGateway } from "../application/flash-gateway";

export const createHttpFlashGateway = (): FlashGateway => ({
  pop: async () =>
    (await httpRequest<{ message: string | null }>("POST", "/api/flash/pop"))
      .message,
});
