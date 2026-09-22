# K6a Catalog Seed Tool — Codex Execution Report

Status: IMPLEMENTED LOCALLY; DATABASE INTEGRATION TEST PENDING GUARDIAN
Instruction: CODEX-20260922-K6A-CATALOG-SEED-TOOL-002
Branch: codex/catalog-seed
Base: 8a30a509fbc21b208dc6938a50cb1122577e1d57
Commits: 730b63d (unchanged source copy), bd9cfa8 (demo support), 0c4ec57 (catalog tooling/tests)

## 1. Preconditions and inputs
GW2-P passed: pinned object is a commit, it is an ancestor of origin/main, and `git show` bytes hash to `63ffeb5f247ae2107983446966de50be3d1d65fffbb3bf5c95e5caffc70c207d`. `origin/codex/test-seed-vanak` was exactly `f7f96ab265293b2a1a30e0e950c0eb56455d6f1d`.

Read-only input hashes matched the instruction:
- vanak_catalog.json: f86f2904d0b838f80dd99d1cac5ba451906d17c060d7029572eaea86c4844586
- demo_businesses.json: 68e9dd8d0d88ef5706999d447d1db83778cd597a20dd7631a835e760e5463fd0
- demo_offers.json: a2733794f408d009c14eaf0162fe0233355f243d7d1ab80d42f0754e927d885b
- demo_catalog.json: a1baac02c86fb8bd64d999b0b339aaa47229a2188d5a9831332aed9eb7665241

No other external path named in the forbidden list was touched.

## 2. T1 source copy
Exactly 12 files under `implementation/tools/test-seed/**` and `implementation/test/tools/test-seed/**` were checked out from f7f96ab. At copy commit 730b63d, all 12 source and destination blob IDs matched (`BLOB_MATCHES=12`). No merge, validation log or old report was copied.

## 3. Implementation
- Deterministic 800x600 RGB PNG generator using Node crypto/zlib only. It derives its colour pattern from SHA-256 of `itemKey:index` and draws a built-in 5x7 bitmap TEST mark on a white band.
- Write-once media store helper validates the external store, uses a temporary file, fsync and exclusive hard link, accepts identical existing content, and rejects a poisoned destination.
- Strict catalog parser rejects unknown/missing fields, invalid IDs/keys/markers/prices/images and duplicate keys.
- Catalog seeding uses CatalogItemService and PublicationService for create, addMedia, activate and publish. Existing fully active/published keys are skipped; partial existing state fails closed.
- `catalog` and `catalog-withdraw` CLI commands were added. The catalog command requires an absolute, existing, out-of-repository `MLINO_MEDIA_STORE_DIR`. Output contains counts/codes only.
- Withdraw uses Core withdraw and retire operations only. No DELETE/TRUNCATE/DROP exists in the new code.
- Demo business parsing permits `demo-NN` only with exact `synthetic://mlino-demo` source and `(آزمایشی)` in the name. Vanak retains the Balad source rule. Offers/catalog accept only vanak-NN or demo-NN; organization mapping stays `test-${test_id}`. Withdraw scope includes only test-vanak-* and test-demo-*.

## 4. Permission-grant finding
Newly bootstrapped test organizations already receive every current Core permission, including `catalog_item.manage`, through BootstrapService. The tool verifies that active grant. If an older test organization lacks it, the implementation invokes the approved PermissionGrantService.issue path.

Current Core makes that remediation impossible for a lone founder: `PermissionGrantService.issue` rejects a grant to the acting membership itself and also requires the actor to already hold the permission being granted. The tool does not bypass Core or write grants directly; it fails closed. Guardian must decide whether old organizations should be re-created/bootstrapped, receive a platform grant operation in Core under a separate CCR, or use another active authorized membership. This is the only confirmed implementation blocker for old pre-K3 test organizations.

## 5. Tests supplied
Database-free tests cover:
- fixed cross-run PNG hashes: c9bd7bdd7300698c215fdc3b7941386a25fe3da2017ee0fdf0d0c8bda563c5f4 and d9301c07efc5da81e8b38cc682e64b6086953fb48fb2a54a8448824236576c22;
- public-export media verifier acceptance and bitmap TEST-band presence;
- write-once rerun and poisoned-file rejection;
- catalog parser positive shape and fixed rejection codes;
- demo/Vanak parser matrix and strict withdrawal scope;
- all existing database-free Vanak/offer/verifier tests.

`catalog.integration.spec.ts` is supplied for Guardian on disposable PostgreSQL. It exercises business bootstrap/grant, catalog create/publish, idempotent rerun, K4 producer output with verified media, withdraw/retire, and confirms catalog row counts never decrease.

## 6. Validation executed
- `tsc --noEmit`: PASS.
- Prisma 5.22 validation with a synthetic localhost URL: PASS (`The schema ... is valid`). No connection was attempted.
- Database-free Jest: 5/5 suites, 56/56 tests PASS.
- Database-backed specs: NOT RUN, as required.
- Forbidden-file diff check: package/lockfile, schema/migrations, Core and public-export have no diff from base.

## 7. Git-show SHA-256
- catalog-images.ts: 099b1b48671c49e3e1e48d3baa6f502dcd853c5dadf7bd2082539aff597b18f7
- catalog.ts: bcd6b996f55e9efaa393e87fb0c07fe5b9d330580e2af9c4c341b6ab36db72d1
- catalog.spec.ts: e4003d75a29cd51d72cf67272ddb78b3e00650dcb06f29ca86072d9ef7f0f85f
- catalog.integration.spec.ts: 1fc5bf71b76226e55fe8fbda93e01a2a26fb38c9ff68fbe9340ce465578bf661

## 8. Files not changed and environment
No schema, migration, Core/public-export source, dependency file, V2 file, external data, image file or real media-store content changed. No network, Docker or database was used. No push was made. The ignored node_modules junction is not committed.

## 9. Remaining risks/open questions
Guardian must run the integration spec on a fresh guarded database and resolve the old-organization permission gap before K6b. The integration run should also verify filesystem semantics of hard-link publication on the intended media volume.

## 10. Recommended next step
Guardian review and disposable-DB execution. Do not run K6b or access local database credentials from this report.
