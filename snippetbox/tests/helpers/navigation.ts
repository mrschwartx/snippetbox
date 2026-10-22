export class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`redirect:${url}`);
  }
}

export class NotFoundSignal extends Error {
  constructor() {
    super("not-found");
  }
}

export async function redirectTarget(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    if (error instanceof RedirectSignal) return error.url;
    throw error;
  }
  return null;
}

export async function isNotFound(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    if (error instanceof NotFoundSignal) return true;
    throw error;
  }
  return false;
}
