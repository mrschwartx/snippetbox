# Release

Releases are automated with [release-please](https://github.com/googleapis/release-please). Versions come from Conventional Commits, never from manual edits.

## Flow

```
merge to main ─► release-please opens or updates the Release PR
Release PR merged ─► tag vX.Y.Z + GitHub Release + CHANGELOG
                  ─► CI on the tag ─► Trivy scan ─► push to Docker Hub
```

The Release PR bumps `snippetbox/package.json`, `snippetbox/package-lock.json` and `version.txt`, so the tag, the GitHub Release, `package.json` and the image tag always match.

## Version bumps

| Commit | Bump |
|---|---|
| `fix(scope): ...` | patch |
| `feat(scope): ...` | minor |
| `feat(scope)!: ...` or `BREAKING CHANGE:` footer | major |
| `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` | none |

Scopes: `snippetbox`, `docker`, `ci`, `deps`. Merge pull requests with **squash** and a conventional title.

## Cut a release

1. Merge feature and fix PRs into `main`.
2. Review the open Release PR (`chore(ci): release X.Y.Z`).
3. Merge it. Everything else is automatic.

Force a version by adding `Release-As: 3.1.0-rc.1` as a footer in a commit on `main`.

## Docker Hub tags

Image: `<DOCKERHUB_USERNAME>/snippetbox`

| Release | Tags |
|---|---|
| Stable `v1.2.3` | `1.2.3`, `1.2`, `1`, `latest`, `sha-<7 chars>` |
| Pre-release `v1.2.3-rc.1` | `1.2.3-rc.1`, `sha-<7 chars>` |

Version tags are immutable: publishing is refused if the tag already exists. `latest` only moves on stable releases and never on a plain push to `main`.

## Gates before publish

- Tag matches `vX.Y.Z` or `vX.Y.Z-pre`.
- Tag commit is on `main`.
- `package.json` version equals the tag.
- Lint, typecheck, tests, E2E and container smoke test pass on the tag.
- Trivy reports no fixable `CRITICAL` or `HIGH` vulnerabilities.

Images are built for `linux/amd64` with SBOM and provenance attestations.

## Failed publish

Open **Actions → Release → Run workflow** and enter the existing tag (for example `v1.2.3`). Do not move or recreate tags.

## Rollback

Deploy the previous version tag (for example `1.2.2`). To fix forward, merge a `fix:` commit and release the next patch.

## One-time setup

| Item | Where | Value |
|---|---|---|
| `RELEASE_PLEASE_TOKEN` | Secrets | Fine-grained PAT or GitHub App token with `contents` and `pull-requests` write. Required so Release PRs trigger CI |
| `DOCKERHUB_USERNAME` | Variables | Docker Hub namespace |
| `DOCKERHUB_TOKEN` | Environment `dockerhub` secret | Docker Hub access token with read and write |
| Environment `dockerhub` | Settings → Environments | Optional required reviewers for manual approval |
| Branch protection on `main` | Settings → Branches | Require PR, squash merge, and checks `pipeline / quality`, `pipeline / e2e`, `pipeline / docker`, `pipeline / commitlint` |

Place `release-please-config.json` and `release-please-manifest.json` at the repository root. Delete `.github/workflows/dockerhub.yml` and the old `ci.yml`.
