export interface AppConfig {
  databasePath: string;
  secureCookies: boolean;
}

export const DEFAULT_DATABASE_PATH = "./data/snippetbox.db";

type Environment = Record<string, string | undefined>;

export const readConfig = (env: Environment): AppConfig => ({
  databasePath: env.DATABASE_PATH || DEFAULT_DATABASE_PATH,
  secureCookies: env.COOKIE_SECURE
    ? env.COOKIE_SECURE === "true"
    : env.NODE_ENV === "production",
});
