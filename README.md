# SnippetBox

Share short text and code snippets. Built with Next.js (App Router), TypeScript and SQLite.

## Features

- Create a snippet with a title, content and an expiry of one day, one week or one year
- View a snippet by its URL
- Latest snippets on the home page
- Expired snippets are hidden automatically

## Structure

```
snippetbox-nextjs/
  app/                routes (pages, /ping health endpoint)
  features/snippet/   validation, repository, service, actions, components, tests
  lib/db.ts           SQLite connection and schema
  e2e/                Playwright tests
snippetbox-docker/    Dockerfile and compose file
```

## Run

```bash
cd snippetbox-nextjs
npm install
npm run dev
```

Open http://localhost:3000. The database file defaults to `./data/snippetbox.db`; override with `DATABASE_PATH`.

## Test

```bash
npm run test:unit
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

## Docker

```bash
cd snippetbox-docker
make docker/up
```

The app is served on http://localhost:3000 (change with `PORT`). Data persists in the `snippetbox-data` volume.

## CI

GitHub Actions runs typecheck, unit and integration tests, build, e2e tests and a Docker build.
