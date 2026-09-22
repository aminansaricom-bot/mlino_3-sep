# بازبینی نگهبان — K6-D (حالت نمایشی) و دستور تازه‌ی K6a

**تاریخ:** ۲۲ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — نگهبان معماری MLINO
**commitها:** `67211da` تا `d7e6da7` روی `8d83839`. **نگهبان شاخه‌ی `codex/v2-demo-mode` را با lease خالی منتشر کرد.**

## حکم K6-D: `APPROVED_NEXT_STEP`

## ۱. راستی‌آزمایی K6-D

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ فقط `src/**` و گزارش · بدون تغییر در nginx، Dockerfile، `package.json` یا منطق سنجش و مصرف فایل عمومی |
| **ساخت و آزمون بدون پرچم** | ✅ ساخت موفق · **۲۹۵ از ۲۹۵** |
| **ساخت و آزمون با `VITE_DEMO_RELOCATE=1`** | ✅ ساخت موفق · **۲۹۵ از ۲۹۵** |
| **قفل زمان ساخت** | ✅ **قوی‌تر از انتظار:** در ساخت بدون پرچم، متن‌های حالت نمایشی **اصلاً در فایل نهایی برنامه نیستند** (۰ مورد). با پرچم، ۱ مورد. پس کد نمایشی در نسخه‌ی عادی فیزیکی حذف می‌شود |
| **K6D-G1** | ✅ جابه‌جایی پس از `toPublicUiRecords` روی کپی رکوردها انجام می‌شود؛ فایل مُهرشده، مصرف‌کننده و کاتالوگ دست نمی‌خورند |
| **K6D-G2** | ✅ فقط `test-demo-` جابه‌جا می‌شود · نوار ثابت · کسب‌وکارهای آزمایشی ونک سر جای خود می‌مانند |
| **K6D-G3** | ✅ نخستین «موقعیت من» دسته را یک بار قرار می‌دهد و ثابت می‌ماند · دکمه‌ی انتقال دوباره · پیش از دریافت موقعیت، دسته پنهان است |
| **K6D-G4** | ✅ فاصله و جهت با محاسبه‌ی کره‌ای حفظ می‌شود و آزمون تلورانس دارد |

**یادداشت:** نگه‌داری لنگر در `localStorage` (اختیاری در دستور) پیاده نشده است. پس از بارگذاری دوباره، کافی است «موقعیت من» زده شود. ایرادی نیست.

## ۲. وضعیت K6a

دستور `CODEX-20260922-K6A-CATALOG-SEED-TOOL-001` **اجرا نشده است** و شاخه‌ی `codex/catalog-seed` وجود ندارد. برای صرفه‌جویی در یک دور، پشتیبانی از دسته‌ی نمایشی (که قرار بود K6a2 باشد) در **دستور تازه‌ی K6a-002** ادغام شد. این دستور جای دستور 001 را می‌گیرد.

## ۳. دستور کدکس — K6a-002 (جایگزین 001)

به خواست مالک، متن دستور کدکس انگلیسی است. **سول** کافی است.

```
INSTRUCTION_ID: CODEX-20260922-K6A-CATALOG-SEED-TOOL-002 (supersedes -001, which was never executed)
TARGET_HANDOFF_ID: HANDOFF-20260922-GUARDIAN-K6D-ACCEPTED
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260921-CATALOG-MEDIA
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260922_CLAUDE_REVIEW_K6D_AND_K6A_002.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: IMPLEMENTATION - a NEW branch codex/catalog-seed from origin/main at the pinned commit, in a NEW worktree
      C:/Users/galexy/mlino code/catalog-seed. LOCAL commits only; do NOT push.
      No database, no Docker, no network, no new dependency (package.json and lockfile MUST NOT change).
PRECONDITION: GW2-P on the pinned record; confirm origin/codex/test-seed-vanak == f7f96ab; record outputs; any
  failure -> STOP. Never open any .env, GITHUB_TOKEN.txt or key file; never touch _KEYS_TEST, _PUBLIC_EXPORT,
  _PUBLIC_EXPORT_PRODUCER or _MEDIA_STORE.
BASIS: everything in -001 (AI_HANDOFF/CLAUDE_REVIEWS/20260922_OWNER_APPROVAL_K5_MERGE_AND_K6.md section 5, decisions
  K6-G1..K6-G4) PLUS the demo cluster of AI_HANDOFF/CLAUDE_REVIEWS/20260922_OWNER_APPROVAL_K6D_DEMO_MODE.md section 2.
  Read-only inputs in C:/mlino code/_TEST_DATA/: vanak_catalog.json (sha256 f86f2904d0b838f80dd99d1cac5ba451906d17c060d7029572eaea86c4844586),
  demo_businesses.json (68e9dd8d0d88ef5706999d447d1db83778cd597a20dd7631a835e760e5463fd0),
  demo_offers.json (a2733794f408d009c14eaf0162fe0233355f243d7d1ab80d42f0754e927d885b),
  demo_catalog.json (a1baac02c86fb8bd64d999b0b339aaa47229a2188d5a9831332aed9eb7665241).

T1..T5 exactly as in -001 (copy the tool from f7f96ab unchanged first and prove it by blob hashes; deterministic
  800x600 PNG generator with an embedded bitmap "TEST" band passing public-export/media.ts; write-once media store
  helper; strict catalog seed with official-service grant of catalog_item.manage, create, addMedia, activate,
  publish, idempotent rerun and withdraw+retire without DELETE; `catalog` and `catalog-withdraw` CLI commands with
  the existing guards plus MLINO_MEDIA_STORE_DIR; tests).
T6 DEMO CLUSTER SUPPORT (new in -002), as a SEPARATE commit after the T1 copy so the diff is reviewable:
  (a) business parser: accept test_id /^demo-\d{2}$/ ONLY when source_url is exactly 'synthetic://mlino-demo' and the
      name contains '(آزمایشی)'; a vanak-NN row keeps requiring an https://balad.ir/p/ source; a demo row with a
      balad source or a vanak row with the synthetic source is rejected. Coordinates stay within the existing 1500 m
      radius check. Organization ids become 'test-demo-NN' through the existing `test-${test_id}` rule.
  (b) offer and catalog parsers: accept test_id vanak-NN or demo-NN; key prefixes stay 'test-ui-vanak-'.
  (c) withdraw functions (offers and catalog): scope = organizations starting with 'test-vanak-' OR 'test-demo-'.
  (d) seeding the demo businesses reuses the existing seed path unchanged otherwise (claims, verification, profile,
      capabilities, activation, publication) and must not change behaviour for vanak rows.
  Tests: parser accept/reject matrix for (a) and (b); withdraw scope; existing vanak tests unchanged and green.
VERIFY (offline): tsc --noEmit; prisma validate with a synthetic URL; jest for database-free specs. Report outputs.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260922_CODEX_K6A_CATALOG_SEED_TOOL_REPORT.md; append only to
  mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: implementation/tools/test-seed/** and implementation/test/tools/test-seed/**, the report (new),
  mlino2/HANDOFF/HANDOFF_STATE.md (append only).
FORBIDDEN: schema, migrations, implementation/core/**, implementation/public-export/**, package.json, lockfile, the
  V2 app, any image file in the repository, the external data files (read-only), Docker, database, network, main,
  push, git config, any .env or key file.
```

## ۴. تصمیم مالک

| # | تصمیم |
|---|---|
| ۱ | **ادغام K6-D در شاخه‌ی نسخه‌ی دوم** · بدون تعارض |

**پاسخ پیشنهادی مالک:**
> «ادغام K6-D در شاخه‌ی نسخه‌ی دوم مجاز است.»

پس از K6a-002: بازبینی نگهبان، و سپس K6b با اجازه‌ی صریح مالک برای پشتیبان، ثبت روی دیتابیس محلی و خواندن DATABASE_URL در حافظه.

من کلاد هستم
