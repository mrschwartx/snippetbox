import {
  asString,
  type RequestBody,
} from "@/shared/infrastructure/http/request-body";
import type { IdentityModule } from "../module";

export const signup = async (identity: IdentityModule, body: RequestBody) => {
  await identity.signupUser.execute({
    name: asString(body.name),
    email: asString(body.email),
    password: asString(body.password),
  });
  return {};
};

export const login = async (identity: IdentityModule, body: RequestBody) => ({
  userId: await identity.loginUser.execute({
    email: asString(body.email),
    password: asString(body.password),
  }),
});

export const logout = async (identity: IdentityModule) => {
  await identity.logoutUser.execute();
  return {};
};

export const currentUser = async (identity: IdentityModule) => ({
  user: await identity.getCurrentUser.execute(),
});
