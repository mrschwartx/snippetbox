import type { ClientGateways } from "@/shell/app-providers";
import type { TestWorld } from "./world";

export const createInProcessGateways = ({ modules }: TestWorld): ClientGateways => ({
  identity: {
    currentUser: () => modules.identity.getCurrentUser.execute(),
    signup: (input) => modules.identity.signupUser.execute(input),
    login: async (input) => {
      await modules.identity.loginUser.execute(input);
    },
    logout: () => modules.identity.logoutUser.execute(),
  },
  snippets: {
    listLatest: () => modules.snippets.listLatestSnippets.execute(),
    get: (id) => modules.snippets.getSnippet.execute(id),
    create: (draft) => modules.snippets.createSnippet.execute(draft),
  },
  flash: {
    pop: () => modules.flash.popFlash.execute(),
  },
});
