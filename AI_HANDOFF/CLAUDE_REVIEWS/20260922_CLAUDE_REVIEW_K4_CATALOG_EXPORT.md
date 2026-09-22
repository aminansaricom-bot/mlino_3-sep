# بازبینی نگهبان — K4: ساخت و توزیع فایل امضاشده‌ی کاتالوگ

**تاریخ:** ۲۲ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — نگهبان معماری MLINO
**commitها:** `f43152a` و `b0e68f9` روی `16bbcbc`. **نگهبان شاخه‌ی `codex/catalog-export` را با lease خالی روی سرور منتشر کرد.**

## حکم: `APPROVED_WITH_FIXES`؛ کار درست و دقیق است، ولی یک ایراد جدی در جداسازی خرابی دارد

## ۱. راستی‌آزمایی دامنه

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ فقط `public-export/**` و آزمون‌های تازه · هیچ آزمون قبلی، schema، هسته، `package.json` یا lockfile تغییر نکرده |
| **ساخت** | ✅ موفق |
| **کل مجموعه روی دیتابیس دور‌ریختنی** | ✅ **۴۹۷ از ۴۹۷**، شامل آزمون دیتابیسی K4 و آزمون DPAPI با حساب مالک |

## ۲. آزمون سرتاسری مستقل نگهبان

یک آزمون کامل روی دیتابیس دور‌ریختنی نوشتم و اجرا کردم:

- ۱۵ کسب‌وکار ونک و پیشنهادهایشان را با ابزار رسمی ساختم.
- ۴ قلم کاتالوگ با **تصویر PNG واقعی و سالم** (۸۰۰ در ۶۰۰، ساخته‌شده با zlib) ساختم و منتشر کردم.
- سپس سازنده و توزیع‌کننده را روی پوشه‌های موقت اجرا کردم.

| بررسی | نتیجه |
|---|---|
| سازمان‌های تازه اجازه‌ی کاتالوگ را خودکار می‌گیرند | ✅ |
| فایل کسب‌وکار ۱۵ رکورد دارد و بایت‌به‌بایت برابر خروجی سازنده است | ✅ |
| امضای کاتالوگ فقط با برچسب کاتالوگ درست است · امضای هر فایل با برچسب دیگری رد می‌شود (دو جهت) | ✅ |
| گره خوردن به snapshot و شناسه‌ی انتشار همان کسب‌وکار | ✅ |
| قلم با تصویر سالم و قلم بدون تصویر منتشر شدند، به ترتیب درست | ✅ |
| **تصویری که پس از انتشار در پوشه‌ی خصوصی دست‌کاری شد** · قلمش حذف و خطای `CATALOG_MEDIA_HASH` ثبت شد · فایلش به پوشه‌ی عمومی نرسید | ✅ |
| قلم پس‌گرفته‌شده در فایل نیامد | ✅ |
| اثرانگشت تصویر منتشرشده در پوشه‌ی عمومی درست است | ✅ |
| ابزار پاک‌سازی در حالت فهرست، صفر مورد نشان داد | ✅ |

## ۳. یافته‌ها

| # | یافته | شدت |
|---|---|---|
| **F1** | **خرابی کاتالوگ، فایل کسب‌وکار را هم متوقف می‌کند.** با آزمون ثابت کردم: یک تصویرِ آلوده در پوشه‌ی عمومی باعث شد توزیع‌کننده کل کار را با `DISTRIBUTION_MEDIA` متوقف کند و **فایل کسب‌وکار به‌روز نشد**. همین حالت در سازنده با `CATALOG_MEDIA_POISONED` هم تکرار شد و فایل تازه‌ی کسب‌وکار ساخته نشد. عمر فایل کسب‌وکار ۳۰۰ ثانیه است. پس **یک تصویر خراب، ظرف پنج دقیقه برنامه‌ی فعلی روی گوشی را هم از کار می‌اندازد**. این خلاف روح K4-G3 و اصل «کاتالوگ اختیاری است» است. همچنین اگر یک بار ساخت کاتالوگ شکست بخورد، کاتالوگِ کهنه در پوشه‌ی سازنده به snapshot قدیمی گره خورده و **در همه‌ی اجراهای بعدی** توزیع کسب‌وکار را هم می‌شکند | **بالا** |
| **F2** | آزمون دیتابیسی K4 نازک است: فایل کسب‌وکار را ساختگی می‌سازد و تصویر، پیوند پیشنهاد و توزیع ندارد. آزمون سرتاسری نگهبان باید به‌شکل دائمی و بدون وابستگی به فایل‌های بیرون از مخزن وارد مجموعه شود | متوسط |
| **N1** | در WebP، جست‌وجوی `ANIM` در کل فایل انجام می‌شود، نه فقط در سرآیند بخش‌ها. ممکن است به‌ندرت یک تصویر ثابت سالم را رد کند. خطا به سمت امن است، ولی باید بخش‌های RIFF پیمایش شوند | کم |
| **N2** | خواندن فایل‌های تصویر داخل تراکنش فقط‌خواندنی دیتابیس انجام می‌شود و تراکنش را طولانی می‌کند. بهتر است سنجش تصویر پس از تراکنش انجام شود | کم |

## ۴. دو انتخاب کدکس که نگهبان می‌پذیرد

| انتخاب | حکم |
|---|---|
| فعال شدن کاتالوگ فقط وقتی `MLINO_MEDIA_STORE_DIR` تنظیم شده باشد | ✅ **پذیرفته.** کلید روشن‌کردن آگاهانه است و استقرار فعلی را دست نمی‌زند |
| نصب اتمیک فایل تصویر با hard link انحصاری به‌جای rename | ✅ **پذیرفته.** `link` روی نام موجود با EEXIST شکست می‌خورد و «یک‌بار نوشتن» را تضمین می‌کند؛ فایل موقت در همان پوشه است، پس همان درایو است |

## ۵. دستور کدکس — K4b

به خواست مالک، متن دستور کدکس انگلیسی است. **سول** کافی است.

```
INSTRUCTION_ID: CODEX-20260922-K4B-CATALOG-EXPORT-ISOLATION-001
TARGET_HANDOFF_ID: HANDOFF-20260922-GUARDIAN-K4-FIXES
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260921-CATALOG-MEDIA
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260922_CLAUDE_REVIEW_K4_CATALOG_EXPORT.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: FIX - continue the EXISTING branch codex/catalog-export (origin/codex/catalog-export = b0e68f9) in the
      EXISTING worktree C:/Users/galexy/mlino code/catalog-export. LOCAL commits only; do NOT push.
      No database, no Docker, no network, no new dependency.
PRECONDITION: GW2-P on the pinned record; confirm HEAD == b0e68f9 and a clean tree; any failure -> STOP.
  Never open any .env, GITHUB_TOKEN.txt or key file.

PRINCIPLE (binding): the catalog is optional. NO catalog or media condition may ever prevent, delay or roll back
  producing or distributing a valid public-business.v1.json. A catalog failure only means: keep the previously
  published catalog and media untouched, log a stable code, and let the consumer's business-snapshot binding hide
  the stale catalog (K-D14).
F1a PRODUCER (cli.ts): wrap catalog build, self-verify and media staging so any failure is caught, logged as
  {"code":"CATALOG_EXPORT_SKIPPED","reason":<stable code>} and the business artifact is still written and rotated
  exactly as before. On a skip the producer does not write or rotate the catalog files. Keep the order business
  file first, catalog file second when both succeed.
F1b DISTRIBUTOR (distribute.ts): verify and publish the business artifact independently of the catalog path
  (read, verify, binding to THIS business artifact, rollback check, media staging, catalog rename). Required
  order: verify business -> verify catalog+binding (on failure mark catalog skipped) -> stage media only if the
  catalog verified (on failure mark catalog skipped) -> rename business -> rename catalog only if not skipped.
  A skipped catalog logs {"code":"DISTRIBUTION_CATALOG_SKIPPED","reason":<stable code>}, leaves the public catalog
  and media untouched, and the run still succeeds (exit 0) because the business file was distributed. A business
  failure keeps its current behaviour and codes.
F2 TESTS: (a) producer: poisoned staged media, unreadable media store and CATALOG_ARTIFACT_SIZE each still write a
  new business file and log CATALOG_EXPORT_SKIPPED; (b) distributor: poisoned public media, invalid catalog
  signature, business-binding mismatch (stale catalog bound to an older business snapshot) and catalog rollback each
  still distribute the new business file, keep the old public catalog byte-identical, and log
  DISTRIBUTION_CATALOG_SKIPPED; (c) a new DB-backed spec test/public-export/catalog-e2e.db.spec.ts using the existing
  test DB guard: bootstrap an organization through the official Core services with a published ACTIVE business
  profile that the business builder includes, create a catalog item with a REAL decodable PNG generated in the test
  (zlib, 800x600), a second item without media, a third item whose private-store bytes are tampered after
  publication, and a withdrawn fourth item; run the producer CLI and the distributor on temp directories; assert the
  business file has the record, the catalog verifies only under the catalog domain, binding ids match, items are
  exactly the first two in order, the tampered one is logged and its file is absent from the public folder, the
  published PNG hashes to its name, and GC dry run lists nothing. It must not read any file outside the repository
  or temp directories. DB specs NOT RUN by you.
N1 WEBP: detect animation by walking RIFF chunks (VP8X flag or an ANIM chunk header), not by searching the whole
  file; add a test with 'ANIM' bytes inside image data that must be ACCEPTED.
N2: read and verify media files after the read-only database transaction has finished, not inside it.
VERIFY (offline): tsc --noEmit; prisma validate with a synthetic URL; jest for every database-free spec including
  all existing public-export specs. Report exact outputs.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260922_CODEX_K4B_CATALOG_EXPORT_ISOLATION_REPORT.md; append only to
  mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: implementation/public-export/** and implementation/test/public-export/** (new specs allowed;
  existing pre-K4 specs unchanged), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only).
FORBIDDEN: schema, migrations, implementation/core/**, package.json, lockfile, the V2 app, nginx, tools/test-seed,
  Docker, database, network, main, push, git config, any .env or key file.
```

## ۶. پس از K4b

نگهبان آزمون سرتاسری و دو حالت خرابی بالا را دوباره اجرا می‌کند. اگر فایل کسب‌وکار در هر دو حالت به‌روز شد، ادغام K4 در main با **تصویب مالک** انجام می‌شود. سپس K5، شامل مسیر nginx، مصرف‌کننده و ویترین دوربین.

من کلاد هستم
