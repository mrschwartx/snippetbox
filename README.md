# SnippetBox

Share short text and code snippets. A single Next.js app that stores its data in a SQLite database on the server.

Next.js 16 (App Router) · React 19 · TypeScript · SQLite (better-sqlite3) · Vitest + Testing Library · Playwright · Docker

## Features

Signup, login, logout (12h session) · create snippets expiring in 1 day, 1 week or 1 year · latest 10 snippets · snippet view · flash messages · light/dark theme · `/ping` health check.

## Run

```sh
cd snippetbox
npm install
cp .env.example .env.local
npm run dev
```

Docker (from `snippetbox-docker`):

```sh
make docker/up
make docker/down
```

App: http://localhost:3000 (`PORT` overrides the host port). The compose file mounts a named volume on `/data`, so the database survives container re-creation.

## Quality gates

| Command                    | What it runs                                                              |
| -------------------------- | ------------------------------------------------------------------------- |
| `npm run lint`             | ESLint: Next.js rules, English naming convention, no comments             |
| `npm run typecheck`        | `tsc --noEmit`                                                            |
| `npm test`                 | unit + integration + UI + architecture tests (Vitest)                     |
| `npm run test:unit`        | domain, application, adapters, architecture rules (no database, no DOM)   |
| `npm run test:integration` | real SQLite: repositories, migrations, modules wired together, API routes |
| `npm run test:ui`          | React screens in jsdom against the real modules                           |
| `npm run test:coverage`    | everything above with coverage thresholds (90% lines, 80% branches)       |
| `npm run test:e2e`         | Playwright in a real browser against `next start` (run `npm run build` first) |
| `npm run verify`           | lint, typecheck, coverage and end-to-end in one go                        |

First time running the browser tests: `npx playwright install chromium`.

## Configuration

| Variable        | Default                | Description                                                                                                                                    |
| --------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`          | `3000`                 | Port the app listens on.                                                                                                                       |
| `DATABASE_PATH` | `./data/snippetbox.db` | Path of the SQLite file. The directory is created on first start. The Docker image sets it to `/data/snippetbox.db`.                           |
| `COOKIE_SECURE` | `true` in production   | Adds the `Secure` flag to cookies. Set to `false` when serving over plain HTTP on a host other than `localhost`, or login will appear to fail. |

## Architecture

SnippetBox is a **feature based modular monolith**. Each feature is a module that owns its domain, use cases, persistence, HTTP adapters and UI. Modules are deployed together but know nothing about each other's internals.

```
src/
  modules/
    identity/         users, sessions, signup, login, logout
    snippets/         snippets, expiry rules, create / view / list
    flash/            one-shot messages shown after redirects
      domain/           entities, value objects, validation rules, repository ports
      application/      use cases and the ports they need (hasher, cookie, notifier, gateway)
      infrastructure/   SQLite repositories, migrations, cookies, crypto, browser HTTP gateway
      api/              controllers that translate an HTTP body into a use case call
      presentation/     React providers, hooks, pages
      module.ts         wires the module's use cases to its infrastructure
      index.ts          server public API
      client.ts         browser public API
  shared/
    kernel/           DomainError, ValidationError, Validator, Clock
    infrastructure/   SQLite connection + migrator, cookie jar, HTTP error mapping, config, clock
    ui/               form helpers shared by pages
  bootstrap/          composition root: opens the database, wires modules together, route helper
  shell/              site header, navigation, footer, client providers
  app/                Next.js routes: thin wrappers that call controllers and render module pages
tests/
  unit/               pure tests: domain, use cases, adapters, architecture rules
  integration/        real SQLite: persistence, migrations, modules, API routes
  ui/                 React screens
  e2e/                Playwright journeys and HTTP contract
  support/            BDD helpers, in-memory fakes, repository contracts, test world
```

### Rules, enforced by `tests/unit/architecture`

- `domain` imports only its own domain and the shared kernel.
- `application` imports only its own domain, application and the shared kernel.
- A module reaches another module only through `@/modules/<name>` (server) or `@/modules/<name>/client` (browser), never through internals.
- Shared code never imports a module. Modules never import `bootstrap`, `shell` or `app`.
- Nothing reachable from the browser entry points imports `node:*`, `better-sqlite3` or `next/headers`.
- No source file contains a comment.

### How modules collaborate

Modules stay decoupled through ports that the composition root satisfies in `src/bootstrap/server-modules.ts`:

- `snippets` needs to know whether the visitor is logged in. It declares an `Authenticator` port; the root implements it with `identity.getCurrentUser`.
- `identity` and `snippets` announce outcomes through a `Notifier` port; the root implements it with `flash.pushFlash`.

### Request flow

The browser never touches the database. Pages talk to a gateway interface owned by their module. In the browser the gateway is an HTTP client for the `/api/*` routes. Each route builds the server modules with the SQLite database and the request cookies, runs a controller, and maps domain errors to HTTP responses by error kind.

| Route                   | Module   | Use case                     |
| ----------------------- | -------- | ---------------------------- |
| `POST /api/signup`      | identity | sign up                      |
| `POST /api/login`       | identity | log in                       |
| `POST /api/logout`      | identity | log out                      |
| `GET /api/me`           | identity | current user                 |
| `GET /api/snippets`     | snippets | latest active snippets       |
| `POST /api/snippets`    | snippets | create snippet               |
| `GET /api/snippets/:id` | snippets | view snippet                 |
| `POST /api/flash/pop`   | flash    | read and clear flash message |

### Database

Each module owns its migrations (`modules/<name>/infrastructure/migrations.ts`). They are concatenated in `src/bootstrap/database.ts` and applied on startup. Applied ids are recorded in the `schema_migrations` table. To change a schema, append a migration to the owning module; never edit an existing one.

Databases created by the previous layout, which tracked state with `PRAGMA user_version`, are adopted automatically on first start without losing data.

Tables: `users` (email is unique, case-insensitive), `sessions` (identity), `snippets`. Snippet and user IDs use `AUTOINCREMENT`, so IDs are never reused.

### Sessions and flash messages

A session is a random 256-bit token stored in an `HttpOnly`, `SameSite=Lax` cookie. Only the SHA-256 hash of the token is stored in the `sessions` table. Logging in with an unknown email still performs a password verification so response time does not reveal which accounts exist. Flash messages live in a short-lived `HttpOnly` cookie and are cleared when read. Mutating routes require `Content-Type: application/json`.

## Testing approach

- **TDD**: domain rules and use cases are specified first with fast in-memory fakes. Bugs found later (see below) are reproduced by a failing test before they are fixed.
- **BDD**: use case, module and UI specs read as `feature` / `scenario` / `given` / `when` / `then`; Playwright specs use the same vocabulary through `test.step`.
- **Contract tests**: `tests/support/contracts` define what a repository must do. The in-memory fakes and the SQLite implementations run the same contract, so fakes cannot drift from reality.
- **Integration**: real SQLite, including adoption of a database written by the previous version of the app.
- **End-to-end**: a production build in a real browser, covering journeys, cookie hardening, security headers, XSS safety and the HTTP contract.

## Limits

- All users share one database, and the app runs as a single instance because the data is one SQLite file.
- Snippets that have expired are hidden but not deleted from the database.
- There is no rate limiting on login or signup.
- Pages render on the client, so initial HTML for the home page and snippet pages is empty until JavaScript loads.

## References

- [Next.js documentation](https://nextjs.org/docs) – App Router, Route Handlers, `output: "standalone"`, `serverExternalPackages`
- [React documentation](https://react.dev)
- [Domain-Driven Design Reference – Eric Evans](https://www.domainlanguage.com/ddd/reference/)
- [The Clean Architecture – Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Vitest](https://vitest.dev) · [Testing Library for React](https://testing-library.com/docs/react-testing-library/intro/) · [Playwright](https://playwright.dev)
- [Cucumber: BDD](https://cucumber.io/docs/bdd/) – Given / When / Then style used in the specs
- [SQLite documentation](https://www.sqlite.org/docs.html) · [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [MDN: HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [MDN: `SubtleCrypto.deriveBits()`](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveBits)
- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
