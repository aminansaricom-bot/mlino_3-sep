# ثبت تصویب مالک — ادغام K5 در شاخه‌ی نسخه‌ی دوم و مجوز K6

**تاریخ:** ۲۲ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO

## ۱. متن تصویب مالک

> «ادغام K5 در شاخه‌ی نسخه‌ی دوم مجاز است؛ مرحله‌ی K6 (داده‌ی آزمایشی کاتالوگ و آزمون روی گوشی) مجاز است.»

## ۲. اقدام نگهبان

- شاخه‌ی `codex/v2-catalog-ui` در `9e2143b` بدون تعارض در شاخه‌ی `codex/v2-intent-flow-foundation` ادغام شد. commit ادغام `8d83839` است و با lease روی `47b1733` منتشر شد.
- فایل داده‌ی آزمایشی کاتالوگ را نگهبان نوشت: `C:/mlino code/_TEST_DATA/vanak_catalog.json`، بیرون از مخزن، ۱۷ قلم و ۱۷ تصویر، sha256 `f86f2904…4586`.
  - هفت کسب‌وکار ونک پوشش داده شده‌اند: کافه‌ها، رستوران، نانوایی، کتاب‌فروشی، سوپرمارکت و لوازم برقی.
  - همه‌ی نام‌ها پسوند «(آزمایشی)» و کلید `test-ui-vanak-` دارند.
  - سه قلم «با درخواست» هستند و دو قلم بدون تصویر.

## ۳. تقسیم K6

| بخش | کار | اجراکننده |
|---|---|---|
| **K6a** | ابزار: تولید تصویر ساختگی قطعی و ثبت اقلام از راه رسمی هسته | کدکس (فقط کد، بدون دیتابیس) |
| **K6b** | پشتیبان، ثبت روی دیتابیس محلی، روشن کردن کاتالوگ در سازنده، ساخت دوباره‌ی کانتینر آزمایشی و آزمون روی گوشی | نگهبان · **خواندن DATABASE_URL در حافظه اجازه‌ی صریح جدای مالک می‌خواهد** |

## ۴. تصمیم‌های نگهبان برای K6

| # | تصمیم |
|---|---|
| **K6-G1** | **هیچ تصویری از اینترنت یا شبکه‌های اجتماعی** (K-G3). تصویر با کد ساخته می‌شود: PNG قطعی ۸۰۰ در ۶۰۰ با الگوی رنگی برگرفته از کلید قلم و نوار «TEST» با فونت بیت‌مپی کوچک داخل کد |
| **K6-G2** | ۱۵ کسب‌وکار موجود اجازه‌ی کاتالوگ را ندارند (K2-N1). ابزار این اجازه را **فقط از راه رسمی** `PermissionGrantService` به عضویت بنیان‌گذار همان سازمان آزمایشی می‌دهد |
| **K6-G3** | ابزار فقط سازمان‌های `test-vanak-*` و کلیدهای `test-ui-vanak-*` را لمس می‌کند. پس‌گرفتن با withdraw و retire است، **هرگز DELETE** |
| **K6-G4** | مخزن تصویر خصوصی بیرون از مخزن کد است: `C:/mlino code/_MEDIA_STORE`. ساخت آن در K6b با نگهبان است |

## ۵. دستور کدکس — K6a

به خواست مالک، متن دستور کدکس انگلیسی است. **سول** کافی است.

```
INSTRUCTION_ID: CODEX-20260922-K6A-CATALOG-SEED-TOOL-001
TARGET_HANDOFF_ID: HANDOFF-20260922-OWNER-APPROVAL-K6
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260921-CATALOG-MEDIA
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260922_OWNER_APPROVAL_K5_MERGE_AND_K6.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: IMPLEMENTATION - a NEW branch codex/catalog-seed from origin/main at the pinned commit, in a NEW worktree
      C:/Users/galexy/mlino code/catalog-seed. LOCAL commits only; do NOT push.
      No database, no Docker, no network, no new dependency (package.json and lockfile MUST NOT change).
PRECONDITION: GW2-P on the pinned record; confirm origin/codex/test-seed-vanak == f7f96ab; record outputs; any
  failure -> STOP. Never open any .env, GITHUB_TOKEN.txt or key file; never touch _KEYS_TEST, _PUBLIC_EXPORT,
  _PUBLIC_EXPORT_PRODUCER or _MEDIA_STORE.
BASIS: the existing test-seed tool at f7f96ab (implementation/tools/test-seed/**, implementation/test/tools/
  test-seed/**); the K3 Core services on main (catalog-item-service.ts, permission-grant-service.ts,
  publication-service.ts); the K4 producer media rules (implementation/public-export/media.ts); Guardian decisions
  K6-G1..K6-G4 in section 4 of the pinned record; the input file C:/mlino code/_TEST_DATA/vanak_catalog.json
  (read-only, sha256 f86f2904d0b838f80dd99d1cac5ba451906d17c060d7029572eaea86c4844586).

T1 BRING THE TOOL: copy exactly implementation/tools/test-seed/** and implementation/test/tools/test-seed/** from
   f7f96ab onto the new branch with `git checkout f7f96ab -- <those two paths>` (no merge, no other file, NOT the
   validation logs or old reports). Record their blob hashes before and after to prove they are unchanged.
T2 IMAGES (K6-G1): new implementation/tools/test-seed/catalog-images.ts - pure function (itemKey, index) -> PNG bytes,
   800x600 RGB, zlib from node:zlib only, deterministic (same input -> identical bytes on every run and OS), a colour
   pattern derived from sha256(itemKey:index), and a visible "TEST" band drawn with a small bitmap font embedded in
   the code. Output must pass implementation/public-export/media.ts verifyMediaBytes for type PNG, 800x600.
   A write helper stores bytes write-once at <store>/media/sha256/<2hex>/<sha256>.png (temp+fsync+exclusive link like
   K4 media-stage; an existing file is accepted only if its bytes hash to its name).
T3 CATALOG SEED: new implementation/tools/test-seed/catalog.ts - parse the input strictly (unknown fields rejected;
   test_id must map to an existing test-vanak organization; item_key must start with 'test-ui-vanak-'; name must
   contain '(آزمایشی)'; price rule identical to the Core price check; images 0..8 each with non-empty alt_text).
   For each organization: if its founding membership lacks an ACTIVE catalog_item.manage grant, issue it through
   PermissionGrantService acting as that founding membership (K6-G2); then per item, skipping an existing item_key
   (idempotent rerun): create via CatalogItemService, generate and store images, addMedia at positions 0..n-1,
   activate, publish via PublicationService. A withdraw function withdraws and retires every 'test-ui-vanak-' item
   of test-vanak organizations; never DELETE, TRUNCATE or DROP (K6-G3).
T4 CLI: add `catalog` and `catalog-withdraw` commands to implementation/tools/test-seed/cli.ts with the same guards as
   the existing commands (MLINO_TEST_SEED_CONFIRM, localhost-only DATABASE_URL) plus MLINO_MEDIA_STORE_DIR (absolute,
   existing, outside the repository). Output only counts and codes, never URLs or secrets.
T5 TESTS: unit tests for determinism (fixed expected sha256 for two keys), media.ts acceptance, bitmap band present,
   strict parsing of the real input file shape (using an in-test copy of two rows, not the external file), and
   write-once/poisoned-file behaviour; DB-backed tests with the existing guard (NOT RUN by you) for grant issue,
   create/publish, idempotent rerun, withdraw/retire, and an end-to-end run: seed -> K4 producer CLI with the store
   -> catalog artifact contains the items with verified media.
VERIFY (offline): tsc --noEmit; prisma validate with a synthetic URL; jest for database-free specs. Report outputs.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260922_CODEX_K6A_CATALOG_SEED_TOOL_REPORT.md; append only to
  mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: implementation/tools/test-seed/** and implementation/test/tools/test-seed/** (T1 copy plus new
  files), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only).
FORBIDDEN: schema, migrations, implementation/core/**, implementation/public-export/**, package.json, lockfile, the
  V2 app, any image file committed to the repository, the external data files (read-only), Docker, database,
  network, main, push, git config, any .env or key file.
```

## ۶. پس از K6a

نگهبان ابزار را روی دیتابیس دور‌ریختنی می‌آزماید. سپس برای K6b از مالک **اجازه‌ی صریح** می‌گیرد: پشتیبان، ثبت روی دیتابیس محلی و خواندن DATABASE_URL فقط در حافظه. پس از آن سازنده را با کاتالوگ روشن می‌کند، کانتینر آزمایشی را از شاخه‌ی نسخه‌ی دوم دوباره می‌سازد و مالک روی گوشی آزمون می‌کند.

من کلاد هستم
