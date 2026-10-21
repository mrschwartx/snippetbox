import { readConfig } from "@/shared/infrastructure/config";
import { toErrorResponse } from "@/shared/infrastructure/http/error-mapping";
import { NextCookieJar } from "@/shared/infrastructure/http/next-cookie-jar";
import {
  readJsonBody,
  type RequestBody,
} from "@/shared/infrastructure/http/request-body";
import { getDatabase } from "./database";
import { createServerModules, type ServerModules } from "./server-modules";

export interface RouteContext {
  modules: ServerModules;
  body: RequestBody;
}

export const handle = async (
  request: Request,
  run: (context: RouteContext) => Promise<unknown>,
  status = 200,
): Promise<Response> => {
  try {
    const body = request.method === "GET" ? {} : await readJsonBody(request);
    const modules = createServerModules({
      database: getDatabase(),
      cookies: new NextCookieJar(),
      secureCookies: readConfig(process.env).secureCookies,
    });

    const result = await run({ modules, body });
    return Response.json(result ?? {}, { status });
  } catch (error) {
    return toErrorResponse(error);
  }
};
