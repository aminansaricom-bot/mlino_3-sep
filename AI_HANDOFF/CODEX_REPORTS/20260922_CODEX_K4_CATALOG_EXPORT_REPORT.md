# K4 — Signed catalog export and distribution report

## 1. Task executed

Implemented `CODEX-20260922-K4-CATALOG-EXPORT-001` on a new local `codex/catalog-export` worktree from `16bbcbcc4d2bf32c354756cf07bab3bac3e3cdd0`. Implementation commit: `f43152a851a9ff1471215ec451fdb9e7b6a75d17`. No push was attempted.

## 2. Sources and precondition

- Pinned approval: `16bbcbcc4d2bf32c354756cf07bab3bac3e3cdd0:AI_HANDOFF/CLAUDE_REVIEWS/20260922_OWNER_APPROVAL_K4.md`.
- GW2-P: `git cat-file -t` → `commit`; `git merge-base --is-ancestor ... origin/main` → exit 0; raw `git show` SHA-256 → `15003c9cb21bdd609e9d7f894dcfdcbf137ba94e5daf42ae71679a9a2330c11c` (matches pin).
- Approved Catalog CCR sections 5, 6, 8 and 9; K1 design sections 3, 4 and 8; K4-G1 through K4-G5. The branch base was exactly the pinned main commit.

## 3. Files changed

| Area | Files | Result |
| --- | --- | --- |
| E1 signing | `implementation/public-export/signing.ts` | Business signature domain remains the default, with unchanged business signed bytes; catalog uses `MLINO-PUBLIC-CATALOG-V1\n`. |
| E2 builder | `catalog-builder.ts`, `catalog-artifact.ts` | Published snapshot only, live hide gates, business binding, filtered offer links, deterministic ordering, canonical snapshot ID, size cap and catalog-domain verification. |
| E3 media | `media.ts`, `media-stage.ts` | Private-store path confinement, symlink rejection, hash/size/magic/dimensions checks, animation rejection and content-addressed write-once staging. |
| E4 producer | `cli.ts` | With `MLINO_MEDIA_STORE_DIR` set, builds business then catalog at the same `asOf`, stages media, publishes business then catalog, and retains two catalog versions. Business-only mode remains compatible when that variable is absent. |
| E5 distributor | `distribution/distribute.ts` | Optional catalog verification and binding; media first, business second, catalog last; source-catalog absence leaves existing public catalog alone. |
| E6 GC | `distribution/media-gc.ts`, `distribution/media-gc-cli.ts` | Dry run by default; current and two retained artifacts are verified; `--apply` requires two matching scans and files older than seven days. |
| E7 tests/fixture | `implementation/test/public-export/catalog-{export,cli,distribution}.spec.ts`, `catalog-builder.db.spec.ts`, `fixtures/public-catalog.v1.fixture.json` | Database-free, guarded database-backed and frozen test-only fixture coverage. |
| Governance | This report; `mlino2/HANDOFF/HANDOFF_STATE.md` | New report and append-only handoff. |

## 4. Files not changed

No schema, migration, Core service, dependency manifest, lockfile, V2 app, nginx, test-seed tool, existing public-export spec or main branch was changed. No database, Docker, network, real key, real image or forbidden deployment directory was used. Dependencies were read through an ignored local `node_modules` junction to the pre-existing `catalog-core` installation; no installation or manifest edit occurred.

## 5. Tests executed and exact results

| Command/check | Result |
| --- | --- |
| `prisma validate --schema prisma/schema.prisma` with a synthetic localhost:5499 URL | PASS: `The schema at prisma\schema.prisma is valid` |
| `tsc --noEmit -p tsconfig.json` | PASS, exit 0, no diagnostics |
| `jest test/public-export --runInBand --testPathIgnorePatterns catalog-builder.db.spec.ts dpapi.integration.spec.ts --testNamePattern '^(?!.*real PostgreSQL builder)'` | 12 suites passed; 66 tests passed, 2 skipped, 68 total; exit 0 |
| Separate `dpapi.integration.spec.ts` | 1 suite / 1 test skipped with visible `DPAPI_PROFILE_UNAVAILABLE: CurrentUser probe failed`; exit 0 |
| `git diff --cached --check` for implementation commit | PASS |

The two skipped tests in the main Jest run include the existing PostgreSQL test excluded by name and one existing skipped test. The new `catalog-builder.db.spec.ts` was NOT RUN under K4-G5. The full V1/Core suite, migrations, container checks, nginx routes and a real operator export were NOT RUN. Guardian must use a disposable guarded database for the database-backed test.

## 6. Evidence and fixture

- Frozen fixture Git-byte SHA-256: `dc945f4aefb705956000c21cb8b14eb05ff3f0f2bf12912eaef7ed8494a47442`.
- Fixture public key (test-only, raw base64url): `iojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1w`.
- Fixture expected snapshot ID: `sha256:3676bba2d48ba3127cfafa60656e93a4e09ef5d9f2e0124144762fd4d505bdc9`.
- Unit tests cover cross-domain replay in both directions, byte-for-byte business signature calculation, published-content fidelity, withdrawn visibility, offer-link filtering, exact 1,999,999/2,000,001-byte boundaries, PNG/JPEG/WebP/AVIF headers, animation, symlink/traversal/poisoned media, CLI business-byte parity, distribution fault injection and order, rename retry/rollback, and GC retention/corruption.

## 7. Operator runbook (future authorized deployment)

Set `MLINO_EXPORT_OUTPUT_DIR` to an absolute private producer directory outside the repository, `MLINO_MEDIA_STORE_DIR` to an absolute existing private media directory outside the repository, `MLINO_EXPORT_KEY_ID` and `MLINO_EXPORT_KEY_PROVIDER_MODULE` to the approved signer adapter. `MLINO_EXPORT_AS_OF` is optional and fixes one UTC instant for both artifacts. The media tree must use `media/sha256/<first-two-hex>/<sha256>.<ext>`. The producer CLI writes business and catalog in one run when `MLINO_MEDIA_STORE_DIR` is set; absent it, only the legacy business artifact is written.

For distribution, set `MLINO_EXPORT_OUTPUT_DIR` to the producer directory, `MLINO_PUBLIC_EXPORT_DIR` to the separate public directory, and `MLINO_EXPORT_KEYSTORE_PATH` to the approved public-only descriptor. The distributor does not read protected private key material. The GC CLI uses the same public directory and descriptor; without `--apply` it lists candidate paths only. Apply only after review of its dry run. K5 must provision the catalog/media routes before exposure; K4 does not alter nginx.

## 8. Open implementation choices and limitations

- The new producer feature is gated by `MLINO_MEDIA_STORE_DIR` so existing business-only CLI callers and unchanged tests keep working. Guardian should approve this rollout switch explicitly.
- Media staging writes a temporary file, fsyncs it, then uses an **exclusive atomic hard link** to install its content-addressed name; this prevents overwriting a concurrent or poisoned destination. The instruction says temp+flush+rename; the final atomic step is a hard link instead of rename because rename may overwrite on some platforms. Guardian should review this intentional difference before deployment.
- The database-backed catalog test and a full producer/distributor run against disposable PostgreSQL remain for Guardian validation. No claim of database-level K4 PASS is made here.

## 9. Commit hash and remaining risk

Implementation commit `f43152a851a9ff1471215ec451fdb9e7b6a75d17`. This report and Handoff are committed in a subsequent local documentation commit. No remote branch was updated. The remaining material risk is unverified database integration and the two rollout choices above.

## 10. Recommended next step

Guardian reviews the 14-file implementation diff, runs the guarded database spec and complete safe test matrix, verifies real image headers with synthetic files, and decides whether the rollout switch and atomic hard-link method satisfy K4. Codex stops after this report.

من کدکس هستم
