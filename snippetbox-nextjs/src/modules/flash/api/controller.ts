import type { FlashModule } from "../module";

export const pop = async (flash: FlashModule) => ({
  message: await flash.popFlash.execute(),
});
