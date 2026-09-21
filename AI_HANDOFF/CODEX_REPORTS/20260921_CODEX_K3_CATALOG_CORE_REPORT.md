# K3 — Catalog Core implementation report

## 1. Task executed

Implemented the owner-approved Catalog Core slice on local branch `codex/catalog-core` from `2786dfb9d169d50e41687d5a09a80e3beb697547` under `CODEX-20260921-K3-CATALOG-CORE-001`. This is a handoff for Guardian database validation, not approval to apply the migration to any environment.

## 2. Source documents

- `2786dfb9d169d50e41687d5a09a80e3beb697547:AI_HANDOFF/CLAUDE_REVIEWS/20260921_OWNER_APPROVAL_K2_CCR_AND_K3.md` (binding approval, K-Q1=B, K-Q2=A, K-Q3=A, K-Q4=B, K2-N1..N3, K3-G1).
- `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CATALOG_ITEM_AND_MEDIA.md` from the pinned main base (C1–C9).
- Existing `implementation/prisma/schema.prisma`, Core foundation and published-content migrations, `capability-service.ts`, `offer-service.ts`, `publication-service.ts`, permission registry, error adapter, transaction helper, and Core test guards.

## 3. Files changed

| Path | Purpose |
| --- | --- |
| `implementation/prisma/schema.prisma` | Catalog enums, three models, tenant-safe relations, and fourth Publication target; 106 additions, no deletions. |
| `implementation/prisma/migrations/20260921010000_add_catalog_items/migration.sql` | One new transaction-wrapped migration; generated Prisma DDL plus manual checks and triggers. |
| `implementation/core/catalog-item-service.ts` | Item lifecycle, public updates, media mutations and explicit validation. |
| `implementation/core/offer-service.ts` | Tenant-scoped CatalogItem link/unlink before first OfferVersion publication. |
| `implementation/core/publication-service.ts` | Catalog publish/withdraw with locked allowlisted snapshot and `offer_version_links`. |
| `implementation/core/permission-registry.ts` | Appended `catalog_item.manage` at the end; no grant backfill. |
| `implementation/core/error-adapter.ts` | Stable Catalog constraint/trigger error mappings. |
| `implementation/test/core/k3-catalog-core.spec.ts` | Database-backed integration tests; **NOT RUN** under K3-G1. |
| `implementation/test/core/k3-catalog-validation.spec.ts` | Database-free input/allowlist tests. |
| `implementation/test/core/k3-catalog-error-adapter.spec.ts` | Database-free error-code tests. |
| `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CATALOG_ITEM_AND_MEDIA.md` | Header status APPROVED and one dated owner-decision line only. |
| `AI_HANDOFF/CODEX_REPORTS/20260921_CODEX_K3_CATALOG_CORE_REPORT.md` | This report. |
| `mlino2/HANDOFF/HANDOFF_STATE.md` | Append-only K3 entry. |

Implementation content commit: `8c0aa1d`.

## 4. Files not changed

No existing migration, public-export/distribution code, V2 app, test-seed tool, image, dependency manifest, ADR, root handoff file or other branch was changed. The locally copied `node_modules` is ignored by Git and came from `core-prisma-foundation`, not `_PUSH_STAGING`; Prisma Client generation wrote only to this worktree's ignored copy.

## 5. Preconditions and verification commands

GW2-P:

| Check | Output |
| --- | --- |
| `git cat-file -t 2786dfb9d169d50e41687d5a09a80e3beb697547` | `commit` |
| `git merge-base --is-ancestor 2786dfb9d169d50e41687d5a09a80e3beb697547 origin/main` | exit `0` |
| SHA-256 of raw `git show 2786dfb9d169d50e41687d5a09a80e3beb697547:AI_HANDOFF/CLAUDE_REVIEWS/20260921_OWNER_APPROVAL_K2_CCR_AND_K3.md` | `48afb6469a4c8a6648d9620a15c1aeeba9ce6f23a0dd3a1111589aab96979d30`, matched |

All validation used the new worktree. `implementation/.env` and `implementation/prisma/.env` were absent (path-existence checks only). Prisma was given the synthetic, non-routable-for-this-task `localhost:5499/dummy` datasource value solely so schema parsing could run; no database connection command was issued.

| Command | Result |
| --- | --- |
| `npx --offline prisma validate --schema prisma/schema.prisma` | PASS — schema valid, Prisma 5.22.0. An initial attempt without the synthetic datasource failed `P1012` (missing `DATABASE_URL`); no DB access occurred. |
| `npx --offline prisma generate --schema prisma/schema.prisma` | PASS — Prisma Client 5.22.0 generated into this worktree's ignored `node_modules`. |
| `npx --offline tsc --noEmit -p tsconfig.json` | PASS after the final TypeScript/test edits. |
| `npx --offline jest test/core/k3-catalog-validation.spec.ts test/core/k3-catalog-error-adapter.spec.ts --runInBand` | PASS — 2 suites, 11 tests. |
| `git diff --cached --check` | PASS before implementation commit. |

The Prisma migration's generated portion came from **offline** `prisma migrate diff --from-schema-datamodel` on the pinned old schema and `--to-schema-datamodel` on the K3 schema. Its sections were reordered to the CCR sequence, wrapped in one explicit transaction, and extended with the manual SQL. This was code generation only; no migration or schema command contacted a database.

## 6. Test results and mutation plan

The 11 database-backed test cases in `k3-catalog-core.spec.ts` are **NOT RUN (K3-G1)**. They include bootstrap/permission, cross-tenant references, lifecycle, price/revision, media limits, concurrent add and reorder, OfferVersion links, four-target XOR/pair/projection, and publish/idempotent/republish/withdraw with exact snapshot allowlist. The global V1 suite was not run because it includes DB tests. Guardian must run the DB spec and full suite only on a disposable guarded PostgreSQL instance.

| Mutation for Guardian | Named test expected to fail |
| --- | --- |
| Remove the organization-scoped CatalogItem FK from `offer_version_catalog_items` | `k3 tenant composite FK rejects cross-organization media, link and publication` |
| Remove `catalog_item_id` from the four-target XOR | `k3 four-target XOR, catalog pair and direct projection guard reject forged writes` |
| Bypass `catalog_item_publication_projection_guard` | `k3 four-target XOR, catalog pair and direct projection guard reject forged writes` |
| Remove `catalog_item_media_budget_before_change` | `k3 concurrent media additions serialize under the catalog parent byte budget lock` |
| Remove `catalog_item.manage` authorization in the Catalog service | `k3 permission gates deny catalog mutation and publication without active grants` |

## 7. Migration hash

SHA-256 of the raw LF Git blob at `8c0aa1d:implementation/prisma/migrations/20260921010000_add_catalog_items/migration.sql` is `e032c92ff498d76c2fd93b35c0fd26c02a77efc16e8be636a0f54d2bcd7fd959` (22,513 bytes). This was computed from `git show` bytes using Node `execFileSync` plus `crypto.createHash('sha256')`, avoiding PowerShell text conversion.

## 8. Remaining risks and unverified behavior

- **No database validation:** SQL syntax, trigger order, concurrency, FK enforcement, old-row preservation, migration deployment and rollback were not executed. All need Guardian verification on disposable PostgreSQL before merge or local apply.
- **Revision provenance:** The catalog revision guard requires both nested trigger depth and a tag set by the named media/link trigger functions. Direct top-level revision mutation fails; the tag alone is insufficient. Guardian should adversarially test unrelated nested-trigger writes and reject this implementation if the named-origin boundary can be forged by the application role.
- **Prisma drift:** The media position uniqueness is a PostgreSQL `DEFERRABLE INITIALLY IMMEDIATE` constraint under the same mapped name as Prisma `@@unique`. Guardian must verify `prisma migrate diff`/deployment does not try to replace it.
- **DB test determinism:** Concurrent media and reorder tests are compiled but unexecuted. Guardian should examine raw database errors and timing if they fail under load; do not silently loosen an invariant.
- **Metadata trust:** K3 validates declared media metadata and content-addressed path spelling. Actual byte/hash/type/dimension verification, storage and the signed artifact belong to K4 and were not implemented here.

No database, Docker, network, `_PUSH_STAGING`, credential, push or main operation occurred.

## 9. Open choices resolved within this instruction

- K-Q2=A: placeholder kind is exactly `mlino.blurhash.v1`; all other kinds fail the database CHECK and service validation.
- K-Q3=A: grouping label is free text up to 160 characters; the service rejects controls and angle brackets.
- K-Q1=B and K-Q4=B govern K4; K3 does not implement signing or public filtering. The Catalog publication snapshot records sorted raw OfferVersion IDs under `offer_version_links`; the K4 artifact must filter them against the bound business snapshot.
- For implementation details left open by the CCR, K3 chose immutable media metadata except position; remove+add is required for replacement. It also chose a direct top-level item-key immutability trigger and a typed Catalog lifecycle guard. These are stricter than the minimum service-only rules.

## 10. Recommended next step

Guardian independently reviews the code and runs migration, database-backed tests, mutation proofs, migration drift checks and full suite on a disposable PostgreSQL database. No application of this migration to the owner's database and no container rebuild is authorized; such action requires a verified backup and separate owner approval after merge.

من کدکس هستم
