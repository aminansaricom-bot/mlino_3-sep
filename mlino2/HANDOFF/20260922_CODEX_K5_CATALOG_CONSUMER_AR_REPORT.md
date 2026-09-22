# K5 — V2 Catalog Consumer and AR Execution Report

Status: IMPLEMENTED_LOCALLY; FINAL BUILD AND GUARDIAN REVIEW PENDING
Instruction: CODEX-20260922-K5-CATALOG-CONSUMER-AR-001
Branch: codex/v2-catalog-ui
Base: 47b17334f724268f0004c25b37c7849d606be08a
Code commit: 2718564

## 1. Task executed
Implemented a separate signed public-catalog.v1 consumer, strict shape and binding validation, hash-verified media loading, same-origin Nginx routes, business detail cards and AR swipe cards. The business consumer remains independent when catalog retrieval or verification fails.

## 2. Source documents used
Pinned owner approval at 8fa632f29ed85ddeac53f3d953611603b3614b96, verified by GW2-P (commit present; ancestor of origin/main; review SHA-256 f92411d8ee005cc703806fdadccf370311ff10e8e8bf8626ca50a2296bb8bf65). V2 base was verified at 47b1733. Frozen catalog fixture was copied from origin/main with git-show SHA-256 dc945f4aefb705956000c21cb8b14eb05ff3f0f2bf12912eaef7ed8494a47442.

## 3. Files changed
Only mlino2/app/nginx.conf and mlino2/app/src/** were changed for the implementation and tests. Notable files: publicExport/catalog.ts, catalogMedia.ts, catalogCards.tsx, catalogArStack.tsx, RealPublicApp.tsx, verify.ts, and their tests. The fixture is at publicExport/fixtures/public-catalog.v1.fixture.json. This report and the append-only handoff entry are the remaining documentation changes.

## 4. Files not changed
No V1 implementation, schema, migration, dependency manifest, lockfile, trust-bundle acceptance logic, main, or existing V2 branch was changed. No network, Docker, database, real key, or image asset was used. No push was made.

## 5. Tests executed
- Full V2 Vitest run before the last type-only and lazy-loading corrections: 23 files, 288 tests passed.
- TypeScript `tsc -b` after the final corrections: passed.
- `git diff --check` and staged diff check: passed.
- Earlier `npm run build` succeeded, then a later run found a nullable-state TypeScript error. That error was corrected and `tsc -b` passed. A full Vite build after that correction remains unverified because the escalation request was rejected by automatic approval review when account usage was exhausted.

## 6. Test results and limits
Catalog signature domain, fixture parity, 404/TTL/binding isolation, media hash/type/dimension checks, cache poisoning, placeholders, lazy selection, AR swipe, and Nginx structure have passing tests in the 288-test run. The final one-line lazy-selection change and nullable-state correction are covered by the successful TypeScript check but not by a post-change full Vitest rerun. Nginx runtime (`nginx -t`/HTTP) and physical phone/camera AR were not tested under this instruction.

## 7. Commit and git-show hashes
Code commit: 2718564. The following SHA-256 values are from `git show HEAD:<path>` bytes at that commit:
- fixture: dc945f4aefb705956000c21cb8b14eb05ff3f0f2bf12912eaef7ed8494a47442
- catalog.ts: 57e8629b6d06cbae4b20771ae18a0c2687fe94bfee8e9e2b2833fdaebf6000f3
- catalogMedia.ts: 7cfef0851d7620fcd73ccf8bc400af05e90d0ac518a69422efc71f130b6dc11e

## 8. Remaining risks
Nginx route behavior has only structural tests. Real-device AR presentation, media decoding across browsers, and final Vite build need verification. The verified-media Cache Storage entries are rechecked on read; lifecycle cleanup of entries no longer referenced by an accepted catalog remains a follow-up. Catalog failures are contained and produce empty catalog content without changing accepted business records.

## 9. Open questions
No owner decision was made or changed. Guardian should determine whether the cache-retention follow-up is required before release and perform the withheld build/runtime checks.

## 10. Recommended next step
Guardian review of K5, including a full Vite build/test rerun in an approved environment, Nginx runtime check, and media-cache retention assessment. Do not start the next task automatically.
