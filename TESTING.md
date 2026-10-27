# Testing

All commands run from `snippetbox/`.

## Layers

| Layer | Tool | Location | Command |
|---|---|---|---|
| Lint | ESLint | `src`, `tests` | `npm run lint` |
| Types | TypeScript | whole project | `npm run typecheck` |
| Component | Vitest + Testing Library (jsdom) | `tests/components` | `npm run test:components` |
| Integration | Vitest (node, real SQLite) | `tests/integration` | `npm run test:integration` |
| Coverage | Vitest + v8 | all Vitest projects | `npm run test:coverage` |
| End-to-end | Playwright (Chromium) | `tests/e2e` | `npm run test:e2e` |
| Container smoke | Docker + curl | `snippetbox-docker/` | see below |

`npm test` runs every Vitest project. `npm run test:all` adds Playwright.

## Run locally

```bash
npm ci
npm run lint && npm run typecheck && npm test
npx playwright install chromium
npm run test:e2e
```

- E2E builds and starts the app on port `3100` (`E2E_PORT` overrides) with a throwaway database in the OS temp directory, reset on every run.
- Use `CHROMIUM_PATH` to point Playwright at an existing Chromium.

## Container smoke test

```bash
docker build -f snippetbox-docker/snippetbox/Dockerfile -t snippetbox:ci snippetbox
docker run -d --name snippetbox -p 3000:3000 snippetbox:ci
curl -fsS localhost:3000/ping
docker rm -f snippetbox
```

Expect `OK` from `/ping`, `200` on `/`, `/user/login`, `/user/signup`, `/snippet/create`, and `404` on `/snippet/view/1`.

## CI mapping

`ci.yml` runs on every pull request and push to `main`. `release.yml` runs the same pipeline against the release tag before publishing.

| Job | Runs | Notes |
|---|---|---|
| `commitlint` | Conventional Commits check | Pull requests only, skipped for Dependabot |
| `quality` | lint, typecheck, coverage | Uploads `coverage` artifact |
| `e2e` | Playwright | Uploads `playwright-report` on failure |
| `docker` | image build and smoke test | Same checks as above |

Jobs run in parallel and all must pass before merge.

## Troubleshooting

- **Native module errors:** `better-sqlite3` needs Node 22 and a build toolchain. Run `npm ci` again.
- **E2E port busy:** set `E2E_PORT` to a free port.
- **Docker smoke fails in CI:** download the job log, `docker logs snippetbox` is printed on failure.
