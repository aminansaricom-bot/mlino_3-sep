# ثبت تصویب مالک — K4: ساخت و توزیع فایل امضاشده‌ی کاتالوگ

**تاریخ:** ۲۲ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO
**مبنا:** CCR کاتالوگ (تصویب‌شده، در main) · سند طرح K1 در `f02436f` · هسته‌ی K3 در main و اعمال‌شده روی دیتابیس محلی

## ۱. متن تصویب مالک

> «مرحله‌ی K4 (ساخت و توزیع فایل کاتالوگ) مجاز است.»

## ۲. دامنه‌ی K4، به زبان ساده

1. **سازنده:** از روی snapshotهای منتشرشده‌ی قلم‌های کاتالوگ، فایل دوم `public-catalog.v1.json` را می‌سازد و با برچسب امضای جدا مُهر می‌کند (K-Q1=B). این فایل به snapshot فایل کسب‌وکارهای **همان اجرا** گره می‌خورد (K-D14).
2. **تصویرها:** بایت‌های هر تصویر از یک پوشه‌ی خصوصی بیرون از مخزن خوانده می‌شوند. اثرانگشت، اندازه، قالب و ابعاد پیش از انتشار دوباره سنجیده می‌شوند.
3. **توزیع:** ترتیب ثابت است: اول تصویرها، بعد فایل کسب‌وکارها، آخر فایل کاتالوگ. هر کدام با جایگزینی اتمیک منتشر می‌شود.
4. **پاک‌سازی تصویرهای بی‌استفاده:** ابزاری که به‌طور پیش‌فرض فقط فهرست می‌دهد و در هر خرابی متوقف می‌شود.

## ۳. تصمیم‌های نگهبان برای K4

| # | تصمیم |
|---|---|
| **K4-G1** | **بدون وابستگی تازه.** کدکس شبکه ندارد و سازنده نباید کتابخانه‌ی پردازش تصویر بگیرد. K4 تصویر را تغییر اندازه نمی‌دهد و نمی‌سازد؛ فقط مشتق آماده را **می‌سنجد**: بایت‌های آغاز فایل، ابعاد از سرآیند PNG، JPEG، WebP و AVIF، اندازه و اثرانگشت. ساخت مشتق در K6 به‌شکل ساختگی و قطعی انجام می‌شود |
| **K4-G2** | **مسیر nginx به K5 منتقل می‌شود،** چون پیکربندی nginx داخل برنامه‌ی نسخه‌ی دوم است. ترتیب CCR («مسیر پیش از فایل») حفظ می‌شود، چون تا K5 هیچ مصرف‌کننده‌ای این فایل‌ها را نمی‌خواهد |
| **K4-G3** | **فایل کسب‌وکارها باید بایت‌به‌بایت همان رفتار امروز را داشته باشد.** برچسب امضای کسب‌وکار، ساختار و آزمون‌های فعلی دست نمی‌خورند و آزمونی باید این را قفل کند |
| **K4-G4** | پیوند محصول به پیشنهاد فقط به نسخه‌هایی که در فایل کسب‌وکارِ **همان اجرا** واقعاً آمده‌اند (K-Q4=B) |
| **K4-G5** | کدکس دیتابیس و داکر ندارد. آزمون‌های دیتابیسی را می‌نویسد و اجرای آن‌ها با نگهبان است |

## ۴. دستور کدکس — K4

به خواست مالک، متن دستور کدکس انگلیسی است. کار بزرگ و چندبخشی است: ساخت با **سول**، و **بازبینی پایانی با استرا** پیشنهاد می‌شود.

```
INSTRUCTION_ID: CODEX-20260922-K4-CATALOG-EXPORT-001
TARGET_HANDOFF_ID: HANDOFF-20260922-OWNER-APPROVAL-K4
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260921-CATALOG-MEDIA
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260922_OWNER_APPROVAL_K4.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: IMPLEMENTATION - a NEW branch codex/catalog-export from origin/main at the pinned commit, in a NEW worktree
      C:/Users/galexy/mlino code/catalog-export. LOCAL commits only; do NOT push.
      No database, no Docker, no network, no new dependency (package.json and the lockfile MUST NOT change).
PRECONDITION: GW2-P on the pinned record; record the outputs; any failure -> STOP. Never open any .env,
  GITHUB_TOKEN.txt or key file, and never touch C:/mlino code/_KEYS_TEST, _PUBLIC_EXPORT or _PUBLIC_EXPORT_PRODUCER.
BASIS (binding): the approved CCR implementation/remediation/CONTRACT_CHANGE_REQUESTS/
  CONTRACT_CHANGE_REQUEST_CATALOG_ITEM_AND_MEDIA.md sections 5, 6, 8, 9 (K4 list); the K1 design
  f02436f9ac0c48e6df42cf879b5d187ab7d31efc:mlino2/MLINO_CATALOG_MEDIA_DESIGN.md sections 3, 4, 8; Guardian
  decisions K4-G1..K4-G5 in section 3 of the pinned record. Where they differ, this instruction wins.

E1 SIGNING: parameterize the domain separator in implementation/public-export/signing.ts so the business artifact
   keeps 'MLINO-PUBLIC-BUSINESS-V1\n' byte-for-byte and the catalog artifact uses 'MLINO-PUBLIC-CATALOG-V1\n'
   (K-Q1=B). Keep canonicalSignatureBytes strictness. A business signature must never verify as catalog and vice
   versa (test both directions). All existing public-export tests stay unchanged and green (K4-G3).
E2 CATALOG BUILDER: new implementation/public-export/catalog-builder.ts producing the exact
   PublicCatalogExportV1 of CCR 6.1 (contract_version 'mlino.v2.public-catalog.v1'). Inputs: the db, asOf, keyId,
   signing provider, and the ALREADY BUILT business artifact of the same run. Content comes ONLY from the latest
   PUBLISHED catalog Publication published_content (never a live-row spread); live rows may only HIDE (lifecycle
   ACTIVE, organization present in the business artifact, availability window: from <= asOf < until when set).
   Each record: organization_id, business_snapshot_id = that business artifact's snapshot_id,
   business_publication_id = that organization's publication id in it. offer_version_links filtered to offer
   versions present in that business artifact (K4-G4). Ordering exactly per CCR 6.1. snapshot_id = sha256 of
   canonical {contract_version, records}. Canonical size <= 2,000,000 bytes or fail (no truncation).
   Every issue reported through the same onIssue style as builder.ts with stable codes.
E3 MEDIA VERIFICATION (K4-G1): new implementation/public-export/media.ts with no dependency: read bytes from a
   private media store (env MLINO_MEDIA_STORE_DIR, absolute, must exist, outside the repository, same content-
   addressed layout media/sha256/<2hex>/<64hex>.<ext>), reject symlinks and any path escaping the store, and verify
   against the snapshot metadata: exact sha256, byte_size, magic bytes matching media_type (PNG, JPEG, RIFF/WEBP,
   AVIF ftyp brand 'avif'), animation rejected per K-D6 (PNG acTL chunk, WebP VP8X animation flag or ANIM chunk,
   AVIF brand 'avis'), width/height parsed from the header (PNG IHDR; JPEG SOFn;
   WebP VP8/VP8L/VP8X; AVIF ispe) equal to metadata, caps of K-D7. An item with ANY failing media is omitted from
   the artifact with an issue code; never partially shown.
E4 CLI AND ORDER: extend implementation/public-export/cli.ts so one run builds business then catalog from the same
   asOf, writes public-catalog.v1.json with the same temp+fsync+rename+previous-1/-2 rotation and self-verify as the
   business file, and stages the referenced media files next to it under media/sha256/... (write-once: an existing
   file is accepted only if its bytes hash to its name; never overwrite). Business file behaviour is unchanged.
E5 DISTRIBUTION: extend implementation/public-export/distribution/distribute.ts and its cli so a run verifies the
   catalog artifact (signature with the catalog separator, canonical bytes, contract version, freshness as the
   business file, cap) and its binding to the business artifact being distributed in the same run; copies every
   referenced media file first (verify hash/size/type/dimensions again, temp+flush+rename, write-once), then the
   business file, then the catalog file LAST. Any failure keeps the previously published catalog and media. A
   missing catalog artifact in the source means: distribute business only, touch nothing catalog-related. Logs
   contain only public hash/path and result codes.
E6 GC TOOL: new implementation/public-export/distribution/media-gc.ts + cli: candidates are media files not
   referenced by the current catalog artifact nor by previous-1/-2; delete only with an explicit --apply flag AND
   file age > 7 days AND a second scan agreeing; a missing, unparseable or unverifiable artifact stops GC with a code
   and deletes nothing. Default mode lists only.
E7 TESTS: unit tests for E1-E6 (temp directories only, deterministic synthetic image headers built in the test -
   never an image from the internet); DB-backed builder tests using the existing test DB guard (NOT RUN by you);
   a FROZEN fixture under implementation/test/public-export/fixtures/ : one catalog envelope signed with a
   deterministic test-only key, its public key and expected snapshot_id, for K5 to reuse. Cover every CCR section 9
   K4 bullet, including 1,999,999 accepted and 2,000,001 rejected, media-before-catalog fault injection, poisoned
   existing file, traversal and symlink.
VERIFY (offline): npx tsc --noEmit -p tsconfig.json; npx prisma validate (synthetic URL only); jest for every
   database-free spec including ALL existing public-export specs; DB specs NOT RUN (K4-G5). Report exact outputs.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260922_CODEX_K4_CATALOG_EXPORT_REPORT.md - changed files, commands
  and outputs, NOT RUN list, open choices made, the fixture sha256 values, and a short operator runbook for the
  new env variables. Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: implementation/public-export/** (existing files edited only as needed, new files allowed),
  implementation/test/public-export/** (new specs and fixtures; existing specs unchanged), the report (new),
  mlino2/HANDOFF/HANDOFF_STATE.md (append only).
FORBIDDEN: schema, migrations, implementation/core/**, package.json, lockfile, the V2 app and nginx, tools/test-seed,
  any real image, Docker, database, network, main, _PUSH_STAGING, push, git config, any .env or key file.
```

## ۵. پس از K4

نگهبان آزمون‌های دیتابیسی و کل مجموعه را روی دیتابیس دور‌ریختنی اجرا می‌کند، آزمایش‌های حذف را تکرار می‌کند و با کلید آزمایشی یک اجرای کامل سازنده و توزیع را روی پوشه‌های موقت می‌آزماید. سپس K5 (مسیر nginx، مصرف‌کننده و ویترین دوربین) و K6 (داده‌ی آزمایشی)، هر کدام با تصویب جدا.

من کلاد هستم
