# CCR: V1 Test Database Guard

**Status:** DRAFT  
**Scope:** G12a/G12b — V1 test safety only

## Problem

V1 integration specifications contain unscoped `deleteMany({})` cleanup. The
`.env` in `_PUSH_STAGING/implementation/` can point at the live local V1
database, so running the test suite from that location can erase live data.

## Exact scope

Only these three test files are changed, plus this CCR:

- `implementation/test/test-db-guard.ts`
- `implementation/test/setup-env.ts`
- `implementation/test/test-db-guard.spec.ts`
- `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_V1_TEST_DB_GUARD.md`

## Behavior

`assertSafeTestDatabase` is a pure guard. It uses `process.env.DATABASE_URL`
when present, otherwise reads only the `DATABASE_URL` assignment from the
specified env file. An absent URL is allowed for non-database specs. A present
URL is allowed only for local PostgreSQL on port `5499`; port `5435`, the
`@db:` host form, other hosts/ports, and unparsable values are rejected before
the Jest suite can access the database. Error messages never contain the URL
or credentials.

The guard is called from `setup-env.ts` before the existing test-only
`MLINO_JWT_SECRET` setup. That existing secret logic is unchanged.

## Runtime and production impact

There is no production runtime impact. The change is test-only and the
repository `.dockerignore` excludes `test`, so the guard is not copied into
the production image. No schema, migration, API, contract, or database data
is changed.

## Validation evidence

Disposable PostgreSQL 16 validation used tmpfs storage on host port `5499`.
The migration deploy, build, focused guard tests, full V1 suite, and refusal
proof are recorded under `mlino2/validation/g12a/`. The refusal proof used an
unresolvable `@db:5432` URL and showed the guard stopped the suite before any
test executed. No `5435` URL, live V1 database, or `_PUSH_STAGING` command was
used.

LF SHA-256 values for the exact scoped files are recorded in:

`mlino2/validation/g12a/LF-MANIFEST.txt`

## Rollback

Revert the G12a merge commit with `git revert -m 1 <merge-commit>`. This
removes the test guard, its unit tests, CCR, and validation evidence without
changing production data or schema history. G12b is a follow-up hardening of
the same test-only boundary and is reverted with its own commit if needed.

## G12b hardening

G12b closes three dotenv-parity gaps. Every `DATABASE_URL` assignment in both
`implementation/.env` and `implementation/prisma/.env` is inspected; one
unsafe assignment is sufficient to reject, matching last-wins safety rather
than trusting only the first line. The parser accepts an optional `export `
prefix and optional single or double quotes. An explicitly set environment
value still takes precedence over both files and must itself be the disposable
localhost/5499 target.

G12b validation uses the same disposable tmpfs PostgreSQL on port `5499`, the
full V1 suite with the guard active, and an end-to-end refusal using an
unresolvable `@db:` URL. No `5435` URL, live database, or `_PUSH_STAGING` is
used. Evidence and an LF manifest are stored under
`mlino2/validation/g12b/`.
