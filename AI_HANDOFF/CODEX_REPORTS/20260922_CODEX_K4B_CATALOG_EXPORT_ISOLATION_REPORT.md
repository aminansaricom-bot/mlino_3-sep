# K4b — Catalog export failure isolation

## 1. Task executed

Executed `CODEX-20260922-K4B-CATALOG-EXPORT-ISOLATION-001` on `codex/catalog-export`, starting at clean `b0e68f9514adf25e0a19b06470888cfb27cf7e7f`. Producer and distributor now publish a valid business artifact even if optional catalog work fails. Added offline regression cases, a permanent guarded database end-to-end spec, RIFF-chunk WebP detection, and moved private-media verification outside the catalog builder's read-only DB transaction.

## 2. Source documents and precondition

- Pinned review: `ac3616522baea2ded04e69d09ccd63b38c61ce31:AI_HANDOFF/CLAUDE_REVIEWS/20260922_CLAUDE_REVIEW_K4_CATALOG_EXPORT.md`.
- GW2-P outputs: `git cat-file -t` → `commit`; `git merge-base --is-ancestor ... origin/main` → exit 0; raw `git show` SHA-256 → `eb754a91cd8f4ac86ca1841fae1e72b7fc63204a6933b0d97bb30f126c9cf29c` (matches pin).
- Initial HEAD matched `b0e68f9`; initial worktree was clean. No network or fetch was used.

## 3. Files changed

Implementation commit: `a958781` (`fix: isolate catalog export and distribution failures`).

| LF SHA-256 of `git show a958781:<path>` bytes | Path |
| --- | --- |
| `c7d8f6a9fdfb51884148bd7a8cf4f185ef6869710c48b263b449d3bc48393d04` | `implementation/public-export/catalog-builder.ts` |
| `48e3c86bc41ab895d62e027dc6b729991f015c6682f0a18647840ac4419500b2` | `implementation/public-export/cli.ts` |
| `447f696b254ce9a03f2330b1016eb97a50323d3b1360b50b9b32fe761aa1d1b3` | `implementation/public-export/distribution/distribute.ts` |
| `5728647e59192efe1b0cb8896fcb9d67aa6922f4453cb9f76fd5b3e44512dfcc` | `implementation/public-export/media-stage.ts` |
| `5488590f886e3411eab37335f46a9857201084e31eb9be9a2ab704b5d43ab717` | `implementation/public-export/media.ts` |
| `7cfcb47aba9f02035813ef5d1a4add3e49624c0209965914de322e9d30088b06` | `implementation/test/public-export/catalog-cli.spec.ts` |
| `75723168124b37ad57620696cccf6f29759e9ca31fa45c6bc90f38530a88eab0` | `implementation/test/public-export/catalog-distribution.spec.ts` |
| `6aa6aa6b3e79996da5f5b86e3292bb2315e8da0532dd526084f0e7a065a96c55` | `implementation/test/public-export/catalog-e2e.db.spec.ts` (new) |
| `cf3dce3c794a136dcd16e82cf285f3e4d104fbb13ddd937e54b256f80bfce0ce` | `implementation/test/public-export/catalog-export.spec.ts` |

This report is new. `mlino2/HANDOFF/HANDOFF_STATE.md` receives only an appended entry.

## 4. Files not changed

No schema, migration, Core service, pre-K4 spec, package/lockfile, V2, nginx, test-seed, `.env`, or key file was changed. No main or remote branch was changed.

## 5. Tests executed

- `tsc --noEmit` → exit 0.
- `prisma validate --schema prisma/schema.prisma` with an in-process synthetic localhost:5499 URL → exit 0; schema valid. No database connection was made.
- Initial broad `jest --runInBand test/public-export --testPathIgnorePatterns='\\.db\\.spec\\.ts$'` exposed an older real-PostgreSQL test inside `public-export.spec.ts`; it failed because `DATABASE_URL` is intentionally absent. No DB query succeeded.
- Repeated offline run with that named test excluded: `jest --runInBand test/public-export --testPathIgnorePatterns='\\.db\\.spec\\.ts$' --testNamePattern='^(?!.*real PostgreSQL builder runs in one read-only transaction)'` → exit 0.
- `git diff --check` → exit 0. Leak search for connection strings/private-key/token patterns in changed implementation and specs → no matches.

## 6. Test results

Offline run: **12 suites passed, 1 suite skipped; 71 tests passed, 3 skipped**. DPAPI CurrentUser integration reports `DPAPI_PROFILE_UNAVAILABLE` and skips visibly. Producer tests cover missing store, poisoned media, artifact-size failure, preserving prior catalog bytes and successful business bytes. Distributor tests cover bad signature, stale binding, rollback and poisoned media; they assert successful business distribution, unchanged catalog, and stable skip logs. WebP test accepts `ANIM` text inside non-animation chunk data.

`catalog-e2e.db.spec.ts` was **written and typechecked, NOT RUN** as instructed. It uses the disposable-DB guard, official Core bootstrap/claim/verification/profile/catalog/publication services, an in-test zlib PNG, producer/distributor, signature and binding checks, tampered media, withdrawal, and GC dry run. Guardian must run it against disposable PostgreSQL and review any result before K4 closes.

## 7. Commit hash

Implementation: `a958781`. This report and append-only handoff are committed separately on the same local branch. No push.

## 8. Remaining risks

- Database end-to-end behavior remains unverified locally. The Guardian must execute the new spec with the full suite on a disposable database.
- Media staging preflights all references before installing files. A new I/O failure or race during the install phase could still leave a newly installed content-addressed media file even when the catalog is skipped; existing published catalog and media bytes are never overwritten.

## 9. Open questions

None for the implementation scope. Guardian validation and merge approval remain separate gates.

## 10. Recommended next step

Guardian reviews this commit, runs guarded database tests and the full suite, then decides whether K4 may be offered for owner-approved merge. Codex stops here.

من کدکس هستم
