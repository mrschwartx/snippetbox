import { httpRequest } from "@/shared/infrastructure/http/http-client";
import type { IdentityGateway } from "../application/identity-gateway";
import type { UserProfile } from "../domain/user";

export const createHttpIdentityGateway = (): IdentityGateway => ({
  currentUser: async () =>
    (await httpRequest<{ user: UserProfile | null }>("GET", "/api/me")).user,
  signup: async (input) => {
    await httpRequest("POST", "/api/signup", input);
  },
  login: async (input) => {
    await httpRequest("POST", "/api/login", input);
  },
  logout: async () => {
    await httpRequest("POST", "/api/logout");
  },
});
