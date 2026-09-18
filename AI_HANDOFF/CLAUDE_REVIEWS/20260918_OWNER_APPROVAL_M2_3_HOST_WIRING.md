# ثبت تصویب مالک — M2-3: اتصال روی میزبان (کد و آزمون)

**تاریخ:** ۱۸ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian
**مبنا:** ادغام M2-2 در main (`fb1a144`) · تصمیم‌های O1 تا O5 · یادداشت‌های G1، G2 و G5

## ۱. متن مالک

> «M2-3 (اتصال روی میزبان) م»

پیام در همین نقطه بریده شد. با توجه به پیشنهاد قبلی نگهبان، **«مجاز است»** برداشت شد. این تصویب **فقط** نوشتن کد، پیکربندی و آزمون روی شاخه‌ها را شامل می‌شود.

**هر تغییر واقعی روی میزبان مجوز تازه‌ی مالک می‌خواهد:**
- ساختن پوشه‌ی واقعی یا تنظیم ACL روی آن
- rebuild یا اجرای دوباره‌ی کانتینر V2
- هر کلید واقعی

## ۲. تقسیم کار، موازی و بدون هم‌پوشانی فایل

| بخش | مخزن و شاخه | موضوع |
|---|---|---|
| **M2-3a** | V1، شاخه‌ی تازه از main | مرحله‌ی «توزیع»: بررسی امضای artifact جاری و کپی اتمیک **فقط همان فایل** به پوشه‌ی عمومی · اسکریپت ساخت پوشه‌ی عمومی با ACL ویندوز (G1) |
| **M2-3b** | V2، شاخه‌ی تازه از `540ad2d` | مسیر هم‌مبدأ Nginx بدون fallback · mount فقط‌خواندنی · build-argهای عمومی · فایل «شماره‌ی نسخه» و تازه‌سازی صفحه‌های باز (G2) |

**مدل Codex:** نوشتن اولیه با **SOL**. پس از تحویل هر دو و بازبینی نگهبان، یک دور **بازبینی و اشکال‌زدایی با Astra** صادر می‌شود، چون اتصال اجزای مختلف جایی است که خطاهای پنهان پیدا می‌شوند.

## ۳. دستور Codex — M2-3a (V1)

```
INSTRUCTION_ID: CODEX-20260918-M2-3A-PUBLIC-EXPORT-DISTRIBUTION-001
TARGET_HANDOFF_ID: HANDOFF-20260918-OWNER-APPROVAL-M2-3
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-PUBLIC-EXPORT-OPERATIONS
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_M2_3_HOST_WIRING.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL (an Astra review round follows separately).
MODE: IMPLEMENTATION in V1 - a NEW branch codex/public-export-distribution from origin/main at the pinned commit,
      in a NEW worktree C:/Users/galexy/mlino code/public-export-distribution. LOCAL commits only; do NOT push.
      May run IN PARALLEL with M2-3b (different repository area, no shared files).
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials,
  .env files, GITHUB_TOKEN.txt, git config, the Windows credential store, or any real key.
DESIGN BASIS: mlino2/MLINO_PUBLIC_EXPORT_OPERATIONS_DESIGN.md O2 and O5 (decided O2=A, O5=B), Guardian notes G1, G5.

1 NEW implementation/public-export/distribution/distribute.ts (Node built-ins only, NO new dependency):
  distributeCurrent({ sourceDir, publicDir, keyProvider (VerificationKeyProvider), now?, maxAgeMs = 300000 })
  - reads ONLY <sourceDir>/public-business.v1.json (never previous-1/-2, the lock, temp files or anything else);
  - requires the bytes to be canonical (canonicalBytes round trip equals the bytes), the contract_version to be
    mlino.v2.public-business.v1, verifyEnvelope(...) true, and generated_at not older than maxAgeMs and not more
    than 30s in the future -> otherwise a fixed error code and NOTHING is written;
  - refuses when the public copy already holds an artifact with a NEWER generated_at (no rollback);
  - writes <publicDir>/.public-business.<pid>.<ts>.tmp then renames it over <publicDir>/public-business.v1.json
    (atomic replace in the same directory); removes its temp file on any failure;
  - publicDir and sourceDir must be absolute, distinct, not nested in each other and outside the repository;
  - logs only fixed codes and booleans (no snapshot_id, key_id, records, paths or content).
  A thin CLI distribution/cli.ts reading MLINO_EXPORT_OUTPUT_DIR, MLINO_PUBLIC_EXPORT_DIR and
  MLINO_EXPORT_KEYSTORE_PATH (public keys only: build the VerificationKeyProvider from the descriptor's PUBLIC
  entries WITHOUT calling DPAPI or reading protected material).
2 NEW implementation/public-export/distribution/setup-public-folder.ps1 (G1): creates a given folder and sets an
  explicit NTFS ACL with inheritance DISABLED: the producer account -> Modify; a given reader principal -> Read;
  SYSTEM and Administrators -> Full; nobody else. Parameters: -Path, -ProducerAccount, -ReaderPrincipal, and -WhatIf
  support. It must refuse a path inside the repository or equal to the producer output folder. It prints only the
  resulting ACL summary (principal + right), never file contents.
  Add verify-public-folder.ps1 that reads back the ACL and exits non-zero on any deviation.
3 TESTS (jest, TEST keys only, temp directories outside the repository, deleted after):
  - a valid fresh artifact is copied byte-identically; previous-1/-2, lock and temp files in sourceDir are NEVER
    copied (assert the public dir holds exactly one file after success)
  - tampered, non-canonical, wrong contract, unknown key, expired, too-future and older-than-public artifacts are
    each rejected with their exact code and the existing public file is left byte-identical
  - a failure mid-write leaves no temp file and the old public file intact (inject a failing rename)
  - relative, nested, identical or in-repository directories are rejected
  - the CLI never calls a Protector/DPAPI (inject a protector that throws if called)
  - logs contain no snapshot_id, key_id, organization ids or paths
  - PowerShell: run setup-public-folder.ps1 and verify-public-folder.ps1 against a TEMP folder using the current
    account as both producer and reader where a second principal is unavailable; assert inheritance is disabled
    and the verify script passes, then fails after an extra ACE is added. If the sandbox cannot set ACLs, SKIP
    with the visible reason ACL_UNAVAILABLE (the Guardian will run it under the owner's account).
  - MUTATION PROOF (throwaway copy): remove (i) the signature check, (ii) the no-rollback check, (iii) the
    "only the current file" restriction, (iv) the inheritance-disable in the ps1; each must make a test FAIL.
4 VALIDATION: npm run build and the new specs THREE times (skips listed with reasons), logs in
  implementation/validation/m2-3a/, leak grep (PRIVATE KEY, MC4CAQAw, paths).
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_M2_3A_DISTRIBUTION_REPORT.md
- files, requirement -> file -> exact test name, mutation outcomes, run totals with skips, LF sha256, GW2/GW2-P.
  Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES:
- implementation/public-export/distribution/** (new), implementation/test/public-export/distribution/** (new)
- implementation/validation/m2-3a/** (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- any change to existing files (cli.ts, signing.ts, builder.ts, canonical.ts, key-providers/**, schema,
  migrations, package.json, lockfile, docker-compose)
- creating or changing ANY real folder or ACL outside a test temp directory; any real key; running the export CLI;
  scheduling anything; Docker; any database beyond the safe test setup; port 5435; _PUSH_STAGING; push; git config
```

## ۴. دستور Codex — M2-3b (V2)

```
INSTRUCTION_ID: CODEX-20260918-M2-3B-V2-SAME-ORIGIN-ROUTE-001
TARGET_HANDOFF_ID: HANDOFF-20260918-OWNER-APPROVAL-M2-3
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-PUBLIC-EXPORT-OPERATIONS
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_M2_3_HOST_WIRING.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL (an Astra review round follows separately).
MODE: IMPLEMENTATION in V2 - a NEW branch codex/v2-public-export-route from origin/codex/v2-intent-flow-foundation
      at 540ad2d45f245a1bc5960bfdb15dc21b85f00947, in a NEW worktree
      C:/Users/galexy/mlino code/v2-public-export-route. LOCAL commits only; do NOT push.
      May run IN PARALLEL with M2-3a.
PRECONDITION: GW2 or GW2-P on the pinned record (it lives on origin/main); record the outputs; any failure -> STOP.
DESIGN BASIS: mlino2/MLINO_PUBLIC_EXPORT_OPERATIONS_DESIGN.md O2 and O4 (O2=A, O4=A conditional), Guardian G2.

1 nginx.conf: add EXACT-match locations, placed so they win over "location /":
  - location = /public-export/public-business.v1.json -> served from a read-only directory
    /srv/mlino-public-export/ ; Content-Type application/json; charset=utf-8; Cache-Control "no-store, max-age=0";
    X-Content-Type-Options nosniff; if the file is missing -> a real 404 (NEVER index.html); GET/HEAD only;
  - location = /version.json -> no-store, same header rules, 404 if missing;
  - keep every existing security header (remember add_header inheritance is cut at a lower level - repeat them);
  - index.html itself must be served with Cache-Control no-cache so a redeploy is picked up.
2 docker-compose.yml: bind-mount ${MLINO_PUBLIC_EXPORT_DIR:-./public-export-empty} to /srv/mlino-public-export
  READ-ONLY; add an empty ./public-export-empty/.gitkeep so an unset variable yields 404, not an error.
  Dockerfile/compose: pass VITE_PUBLIC_EXPORT_URL (default /public-export/public-business.v1.json) and
  VITE_PUBLIC_EXPORT_TRUST_BUNDLE (PUBLIC JSON only, default empty) as build args; document that the bundle comes
  from M2-2 buildV2TrustBundle and holds public keys only.
3 G2 version refresh:
  - at build, generate dist/version.json = {"build_id": "<id>"} and embed the same id in the app
    (import.meta.env.VITE_BUILD_ID or a vite define); the id must change on every build (for example a timestamp
    plus the short git hash when available) and must not contain secrets;
  - in RealPublicApp, on each 60s polling cycle, fetch /version.json with cache:'no-store'; if it returns a valid
    build_id different from the embedded one, reload the page once (guard against reload loops: at most one reload
    per new build_id, remembered in sessionStorage with try/catch); network or parse errors are ignored (the
    signed-artifact TTL rules stay unchanged);
  - the check must never change the trust bundle or accept keys from the network.
4 TESTS (vitest, no network): the version check reloads on a different id, not on the same id, not on errors,
  and at most once per id; the fetch uses no-store; nginx: a test or script that parses nginx.conf text and asserts
  the exact-match locations exist, carry no-store and nosniff, and contain no try_files fallback to index.html.
  If Docker is not allowed, do NOT run it; state that an nginx -t / live check is left to the Guardian.
  MUTATION PROOF (throwaway copy): (i) remove the reload guard, (ii) add a fallback to /index.html in the artifact
  location, (iii) drop no-store; each must make a test FAIL.
5 VALIDATION: npm run build and npm test in mlino2/app THREE times, committed logs in mlino2/validation/m2-3b/.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_M2_3B_V2_ROUTE_REPORT.md
- files, requirement -> file -> exact test name, mutation outcomes, run totals, LF sha256, GW2/GW2-P.
  Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES:
- mlino2/app/nginx.conf, mlino2/app/docker-compose.yml, mlino2/app/Dockerfile, mlino2/app/vite.config.ts,
  mlino2/app/public-export-empty/.gitkeep (new), mlino2/app/src/publicExport/** (minimal changes + new tests),
  mlino2/validation/m2-3b/** (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- the canonical/verify/trustBundle/consumer acceptance logic (only RealPublicApp wiring and a new version-check
  module may change); any real key; any new dependency; network in tests
- docker build/up or any container action; any real host folder; V1 files; main; _PUSH_STAGING; push; git config
```

## ۵. پس از M2-3a و M2-3b

1. **بازبینی نگهبان.** آزمون‌های ACL و Nginx را اگر در sandbox رد شده باشند، خودم زیر حساب مالک اجرا می‌کنم.
2. **دور Astra:** بازبینی و اشکال‌زدایی مشترک هر دو بخش.
3. **مجوز جداگانه‌ی مالک برای اعمال واقعی روی میزبان:**
   - ساخت پوشه‌ی عمومی با ACL
   - rebuild کانتینر V2
   - آزمون مرورگر با **کلید آزمایشی**
4. **کلید واقعی** (G5)، سپس **M2-4**.

من کلاد هستم
