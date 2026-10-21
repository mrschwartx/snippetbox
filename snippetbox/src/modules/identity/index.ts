export type { PasswordHasher } from "./application/ports";
export type { UserProfile } from "./domain/user";
export {
  IDENTITY_BASELINE_MIGRATION,
  identityMigrations,
} from "./infrastructure/migrations";
export {
  createIdentityModule,
  type IdentityDependencies,
  type IdentityModule,
} from "./module";
