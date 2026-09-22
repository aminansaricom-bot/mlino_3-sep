# ثبت تصویب مالک — حالت نمایشی K6-D

**تاریخ:** ۲۲ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO

## ۱. متن تصویب مالک

> «حالت نمایشی (K6-D) برای جابه‌جایی کسب‌وکارهای آزمایشی به موقعیت فعلی گوشی مجاز است»

**زمینه:** مالک دیگر نزدیک ونک نیست و موقعیتش ثابت نیست. پس کسب‌وکارهای آزمایشی باید هر جا که او هست، دورش ظاهر شوند.

## ۲. داده‌ی دسته‌ی نمایشی (نوشته‌ی نگهبان، بیرون از مخزن)

| فایل | محتوا | sha256 |
|---|---|---|
| `C:/mlino code/_TEST_DATA/demo_businesses.json` | ۶ کسب‌وکار **ساختگی** (`demo-01` تا `demo-06`: کافه، رستوران، نانوایی، داروخانه، کتاب‌فروشی، سوپرمارکت) در ۲۰ تا ۶۰ متری نقطه‌ی مرجع `35.7575, 51.4098` و در شش جهت متفاوت، با ساعت کاری و `source_url` برابر `synthetic://mlino-demo` | `68e9dd8d…3fd0` |
| `C:/mlino code/_TEST_DATA/demo_offers.json` | ۵ پیشنهاد آزمایشی | `a2733794…885b` |
| `C:/mlino code/_TEST_DATA/demo_catalog.json` | ۱۴ قلم کاتالوگ با ۱۴ تصویر | `a1baac02…5241`, کامل: `a1baac02c86fb8bd64d999b0b339aaa47229a2188d5a9831332aed9eb7665241` |

همه‌ی نام‌ها «(آزمایشی)» دارند. هیچ نام، نشانی یا تلفن واقعی در این فایل‌ها نیست.

**یادداشت نگهبان:** ابزار ورود داده‌ی فعلی فقط `vanak-NN` و نشانی `balad.ir` را می‌پذیرد. پشتیبانی از `demo-NN` با منبع `synthetic://mlino-demo` پس از بازبینی K6a، در یک اصلاح کوچک جدا (K6a2) افزوده می‌شود. جعل نشانی بلد برای کسب‌وکار ساختگی **مجاز نیست**.

## ۳. تصمیم‌های نگهبان برای K6-D

| # | تصمیم |
|---|---|
| **K6D-G1** | **فقط در نمایش.** هسته، قرارداد، فایل مُهرشده و سنجش امضا دست نمی‌خورند. جابه‌جایی پس از پذیرش فایل و فقط در لایه‌ی نمایش انجام می‌شود |
| **K6D-G2** | **سه قفل:** (۱) فقط سازمان‌هایی که شناسه‌شان با `test-demo-` شروع می‌شود، (۲) فقط وقتی در زمان ساخت `VITE_DEMO_RELOCATE=1` تنظیم شده باشد، (۳) نوار ثابت «حالت نمایشی — داده‌ی آزمایشی» تا وقتی حالت روشن است |
| **K6D-G3** | **لنگر یک‌باره، نه دنبال‌کردن پیوسته.** اگر دسته پیوسته دنبال کاربر بیاید، هرگز نمی‌شود به یک کسب‌وکار نزدیک شد. پس دسته یک بار در موقعیت فعلی گوشی قرار می‌گیرد، **ثابت می‌ماند** تا کاربر به سمتش راه برود، و با دکمه‌ی «انتقال دسته به اینجا» دوباره جابه‌جا می‌شود |
| **K6D-G4** | فاصله و جهت هر کسب‌وکار نسبت به نقطه‌ی مرجع حفظ می‌شود (محاسبه بر حسب متر شرق و شمال، نه جمع ساده‌ی درجه‌ها) |

## ۴. دستور کدکس — K6-D

به خواست مالک، متن دستور کدکس انگلیسی است. **سول** کافی است. این دستور مستقل از K6a است و **پس از پایان K6a** داده شود.

```
INSTRUCTION_ID: CODEX-20260922-K6D-DEMO-RELOCATION-001
TARGET_HANDOFF_ID: HANDOFF-20260922-OWNER-APPROVAL-K6D
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260921-CATALOG-MEDIA
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260922_OWNER_APPROVAL_K6D_DEMO_MODE.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: IMPLEMENTATION - a NEW branch codex/v2-demo-mode from origin/codex/v2-intent-flow-foundation at 8d83839 in a
      NEW worktree C:/Users/galexy/mlino code/v2-demo-mode. LOCAL commits only; do NOT push.
      No network, no Docker, no database, no new dependency (package.json and lockfile MUST NOT change).
      node_modules: ignored junction to C:/Users/galexy/mlino code/v2-intent-flow/mlino2/app/node_modules.
PRECONDITION: GW2-P on the pinned record (pinned commit on origin/main); confirm
  origin/codex/v2-intent-flow-foundation == 8d83839; record outputs; any failure -> STOP.
  Never open any .env, GITHUB_TOKEN.txt or key file.
BASIS: Guardian decisions K6D-G1..K6D-G4 in section 3 of the pinned record. Demo organizations are the seed-tool
  organizations 'test-demo-01'..'test-demo-06'; reference anchor 35.7575, 51.4098.

D1 PURE MODULE: new src/demo/demoRelocation.ts - relocate(records, anchor, target) returns NEW UI records where only
   records whose organization id starts with 'test-demo-' and that have coordinates are moved: compute the record's
   east/north offset in metres from the anchor (local tangent plane), apply the same offset at the target, return new
   coordinates; every other record is returned as the identical object. Never mutate inputs, never touch the
   verified artifact, the business consumer or the catalog consumer. Distances and bearings between the target and
   each moved record must match anchor-relative ones within 0.5 m and 0.5 degrees.
D2 GATE (K6D-G2): enabled only when import.meta.env.VITE_DEMO_RELOCATE === '1' (declare it in vite-env.d.ts; anchor
   from VITE_DEMO_ANCHOR "lat,lon" with the default above, strictly validated). Without the flag the app is
   byte-for-byte the same behaviour as today and the module is never invoked.
D3 ANCHORING (K6D-G3): when enabled, the first successful geolocation fix places the cluster once (target = that fix)
   and it stays fixed; a clear button «انتقال دستهٔ نمایشی به اینجا» re-places it at the current fix; the chosen
   target may be remembered in localStorage (wrapped in try/catch) and is cleared by a «خاموش کردن حالت نمایشی»
   control. Before any fix, demo records are hidden, not shown at the anchor, with a short Persian hint.
D4 WIRING: apply relocation to the UI records right after toPublicUiRecords in RealPublicApp so the map, list,
   nearby filter, distances, detail view, catalog lookup by organization and the AR vitrine all use the relocated
   coordinates; the catalog stays keyed by organization id and is unaffected.
D5 BANNER (K6D-G2): a persistent, non-dismissable top banner «حالت نمایشی — دادهٔ آزمایشی» while enabled.
D6 TESTS (vitest): flag off -> identity and module not called; only 'test-demo-' records move; non-demo and
   coordinate-less records untouched and identical; offset preservation within tolerance at several targets
   (Tehran and far away); anchor parsing rejects bad input; no fix -> demo hidden; re-anchor button moves the cluster
   once and it stays fixed across later fixes; banner present only when enabled.
VERIFY (offline): npm run build and npm test in mlino2/app, both with and without VITE_DEMO_RELOCATE=1; report
  outputs.
REPORT (new file): mlino2/HANDOFF/20260922_CODEX_K6D_DEMO_RELOCATION_REPORT.md; append only to
  mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: mlino2/app/src/** (new files allowed; existing files edited only as needed), the report (new),
  mlino2/HANDOFF/HANDOFF_STATE.md (append only).
FORBIDDEN: nginx.conf, Dockerfile, docker-compose.yml, package.json, lockfile, the public-export verify/consumer/
  mapping/catalog logic, anything under implementation/, any data file, Docker, database, network, main, push,
  git config, any .env or key file.
```

## ۵. ترتیب اجرا

1. K6a (ابزار ورود کاتالوگ)، که الان دست کدکس است، و بازبینی نگهبان.
2. K6a2 (اصلاح کوچک برای پذیرش `demo-NN` با منبع ساختگی) و K6-D (حالت نمایشی)، به‌ترتیب و هر کدام با بازبینی.
3. K6b: پشتیبان، ثبت دسته‌ی نمایشی و کاتالوگ روی دیتابیس محلی، روشن کردن کاتالوگ در سازنده و ساخت نسخه‌ی آزمایشی با `VITE_DEMO_RELOCATE=1`. **اجازه‌ی صریح جدای مالک برای DATABASE_URL لازم است.**

من کلاد هستم
