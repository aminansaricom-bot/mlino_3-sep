# K3b — Catalog Core fixes report

## 1. Task executed

Applied F1 and F2 from `CODEX-20260922-K3B-CATALOG-CORE-FIXES-001` on `codex/catalog-core`. Implementation commit: `72459d4`. This is a local handoff for Guardian review; no push was attempted.

## 2. Source documents and precondition

- Pinned review: `4303e58b3dbd493acbd17ab0af260617be097638:AI_HANDOFF/CLAUDE_REVIEWS/20260922_CLAUDE_REVIEW_K3_CATALOG_CORE.md`.
- `git cat-file -t 4303e58b3dbd493acbd17ab0af260617be097638` → `commit`.
- `git merge-base --is-ancestor 4303e58b3dbd493acbd17ab0af260617be097638 origin/main` → exit 0.
- SHA-256 of raw `git show` review bytes → `2d8a52727b2929092bff8b2e493114beacb8ec1a819e652f27e90e9593837eb2` (matches pin).
- Initial HEAD → `1b3c5b921e9e51a4ea091fe40291ca06d7893a5e`; initial worktree clean.
- K3 migration, Catalog service, error adapter, permission registry and existing tests were read as implementation sources.

## 3. Files changed

| File | Change |
| --- | --- |
| `implementation/core/catalog-item-service.ts` | Reject invalid availability on create before database access; lock and read current bounds, then validate merged bounds before update. |
| `implementation/core/error-adapter.ts` | Named mappings for all 19 new K3 CHECK constraints on catalog items, catalog media and publications. |
| `implementation/test/core/k3-catalog-validation.spec.ts` | Database-free reversed/equal create-range test. |
| `implementation/test/core/k3-catalog-error-adapter.spec.ts` | One parameterized database-free case for each of the 19 CHECK names. |
| `implementation/test/core/k3-catalog-core.spec.ts` | Database-backed case now asserts `VALIDATION_FAILED` on a one-bound invalid update and an unchanged stored bound. |
| `implementation/test/core/core-authority.spec.ts` | Replaced the fixed founding-grant count of 16 with `CORE_PERMISSION_KEYS.length`; added its import. |
| `AI_HANDOFF/CODEX_REPORTS/20260922_CODEX_K3B_CATALOG_CORE_FIXES_REPORT.md` | This report. |
| `mlino2/HANDOFF/HANDOFF_STATE.md` | Append-only K3b entry. |

## 4. Files not changed

No migration, schema, other product/test file, configuration, dependency manifest, ADR or root handoff file was changed. No database, Docker, network, credential file, `.env`, main branch or remote was accessed for a write. The K3 migration's raw `git show HEAD:implementation/prisma/migrations/20260921010000_add_catalog_items/migration.sql` SHA-256 remains `e032c92ff498d76c2fd93b35c0fd26c02a77efc16e8be636a0f54d2bcd7fd959`.

## 5. Tests executed

- Offline `prisma validate --schema prisma/schema.prisma` with a dummy localhost:5499 URL: PASS.
- `tsc --noEmit -p tsconfig.json`: PASS.
- Database-free Jest: `k3-catalog-validation.spec.ts` and `k3-catalog-error-adapter.spec.ts`, `--runInBand`: 2 suites / 30 tests PASS.
- `git diff --cached --check`: PASS.

## 6. Test results and F1/F2 traceability

| Item | Implementation and evidence | Result |
| --- | --- | --- |
| F1a create | `validatePublic` invokes `validateAvailability` before `inTransaction`; database-free test checks reversed and equal bounds with an unavailable DB stub. | PASS |
| F1a update | Merged supplied/current bounds are checked after `lockItem`, within the transaction, before Prisma update. | TypeScript PASS; DB case NOT RUN |
| F1b | All 19 named K3 CHECKs map to `VALIDATION_FAILED`; one database-free test case per name. | 19 cases PASS |
| F1c | DB-backed case asserts reversed create and one-bound invalid update return `VALIDATION_FAILED`; stored `availableUntil` stays null. | NOT RUN under K3-G1 |
| F2 | Founding count reads `CORE_PERMISSION_KEYS.length`; only import and count line changed. | Diff review PASS; DB case NOT RUN |

Search of `implementation/test` for `toBe(16)`, `toEqual(16)`, fixed permission counts and `CORE_PERMISSION_KEYS.length` found no other literal encoding the permission count or order. The other matches were the new founding assertion, an existing K3 assertion already using `CORE_PERMISSION_KEYS.length`, and an unrelated single-permission count of 1.

## 7. Commit hash

Implementation: `72459d4`. This report and handoff append are committed separately in the next local commit. No push.

## 8. Remaining risks

The database-backed K3 spec and full suite were intentionally not run in this task. The Guardian must verify the new one-bound update assertion against a disposable database. No migration or schema change was made.

## 9. Open questions

None for Codex. Guardian review determines acceptance of F1/F2.

## 10. Recommended next step

Guardian reruns the K3 database validation and reviews the precise six-file implementation diff. Stop here pending that review.

من کدکس هستم
