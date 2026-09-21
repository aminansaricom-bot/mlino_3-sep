# بازبینی نگهبان — K3: کاتالوگ در هسته

**تاریخ:** ۲۲ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — نگهبان معماری MLINO
**commitها:** `8c0aa1d` و `1b3c5b9` روی `2786dfb`. **نگهبان شاخه‌ی `codex/catalog-core` را با lease خالی روی سرور منتشر کرد.**

## حکم: `APPROVED_WITH_FIXES`؛ ساختار درست و محکم است، دو اصلاح کوچک لازم است

## ۱. راستی‌آزمایی دامنه

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ فقط فایل‌های مجاز · هیچ migration قبلی، فایل عمومی، برنامه‌ی نسخه‌ی دوم یا ابزار داده دست نخورده |
| **اثرانگشت migration** | ✅ `e032c92f…d959`، برابر با گزارش کدکس |
| **ناهمخوانی schema با دیتابیس** | ✅ **صفر.** پس از اعمال، مقایسه‌ی Prisma «migration خالی» داد؛ قید یکتای تعویق‌پذیر مشکلی نساخت |
| **ساخت** | ✅ موفق |

## ۲. اجرای مستقل نگهبان روی دیتابیس دور‌ریختنی

| آزمون | نتیجه |
|---|---|
| اعمال هر ۹ migration روی دیتابیس تازه | ✅ موفق |
| آزمون‌های K3، سه بار روی دیتابیس تازه | ⚠️ **۱۰ از ۱۱** در هر سه اجرا، پایدار · یک شکست واقعی (F1) |
| کل مجموعه | ⚠️ **۴۵۹ از ۴۶۱** · دو شکست: F1 و F2 |

**پنج آزمایش حذف، همه شناسایی شدند:**

| حذف | آزمونی که شکست خورد |
|---|---|
| سازمان از کلید پیوند محصول و پیشنهاد | ✅ آزمون جداسازی سازمان‌ها |
| هدف کاتالوگ از قید «دقیقاً یک هدف» | ✅ آزمون قید چهارهدفه |
| نگهبان وضعیت انتشار | ✅ آزمون جعل انتشار |
| سقف حجم تصویرها | ✅ آزمون هم‌زمانی افزودن تصویر |
| بررسی اجازه در سرویس | ✅ آزمون اجازه‌ها و سه آزمون دیگر |

**آزمون‌های حمله‌ی مستقیم نگهبان روی دیتابیس، همه رد شدند:**

| حمله | نتیجه |
|---|---|
| جعل برچسب منشأ و بالا بردن مستقیم revision (نگرانی K2-N3) | ✅ رد شد |
| نوشتن مستقیم وضعیت انتشار | ✅ رد شد |
| ساخت قلم از ابتدا با وضعیت «منتشرشده» | ✅ رد شد |
| شش تصویر ۱٫۵ مگابایتی، یعنی بیش از ۸ مگابایت | ✅ رد شد |
| تغییر متن جایگزین تصویر ثبت‌شده | ✅ رد شد |
| نشانی تصویر ناسازگار با اثرانگشت یا قالب | ✅ رد شد |
| placeholder با قالبی جز `mlino.blurhash.v1` | ✅ رد شد |
| تغییر کلید قلم | ✅ رد شد |

جابه‌جایی ترتیب دو تصویر با قید تعویق‌پذیر درست کار کرد و revision برای هر تغییر بالا رفت.

## ۳. یافته‌ها

| # | یافته | شدت |
|---|---|---|
| **F1** | بازه‌ی زمانی نامعتبر (پایان پیش از شروع) به‌جای خطای اعتبارسنجی، **خطای داخلی** می‌دهد. سرویس این بازه را بررسی نمی‌کند و قید `catalog_item_availability_check` در نگاشت خطا نیست. پیشنهاد (`offer_version_validity_check`) این نگاشت را دارد، کاتالوگ ندارد. **خود آزمون کدکس همین را نشان می‌دهد** | متوسط |
| **F2** | آزمون قدیمی `core-authority.spec.ts:60` تعداد اجازه‌های بنیان‌گذار را **عدد ثابت ۱۶** نوشته و با کلید تازه ۱۷ می‌شود. **K-W3 همین را می‌خواست و جا ماند.** صادقانه: جست‌وجوی خود من در بازبینی K2 هم فقط نام فهرست را گشت و این عدد ثابت را ندید. رفتار برنامه درست است و فقط آزمون به طول فهرست وابسته است | کم |

## ۴. دستور کدکس — K3b

به خواست مالک، متن دستور کدکس انگلیسی است. اصلاح کوچک است و **سول** کافی است.

```
INSTRUCTION_ID: CODEX-20260922-K3B-CATALOG-CORE-FIXES-001
TARGET_HANDOFF_ID: HANDOFF-20260922-GUARDIAN-K3-FIXES
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260921-CATALOG-MEDIA
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260922_CLAUDE_REVIEW_K3_CATALOG_CORE.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: FIX - continue the EXISTING branch codex/catalog-core (origin/codex/catalog-core = 1b3c5b9) in the EXISTING
      worktree C:/Users/galexy/mlino code/catalog-core. LOCAL commits only; do NOT push.
      No database, no Docker, no network. The migration file MUST NOT change (its LF sha256 stays
      e032c92ff498d76c2fd93b35c0fd26c02a77efc16e8be636a0f54d2bcd7fd959).
PRECONDITION: GW2-P on the pinned record; confirm HEAD == 1b3c5b9 and a clean tree; any failure -> STOP.
  Never open any .env, GITHUB_TOKEN.txt or key file.

F1 AVAILABILITY / CATALOG CHECK MAPPING:
  (a) catalog-item-service.ts: on create reject availableUntil <= availableFrom with VALIDATION_FAILED before any DB
      call; on updatePublicFields validate the MERGED values (provided field or the locked current row value)
      inside the transaction before the update.
  (b) error-adapter.ts: map EVERY named CHECK constraint on catalog_items, catalog_item_media and publications that
      the K3 migration adds (by constraint name) to a stable Core code - row-shape checks to VALIDATION_FAILED,
      pair/target checks consistent with the existing publication mappings. No generic INTERNAL_ERROR remains for
      any of them.
  (c) tests: a database-free adapter test per constraint name, and extend the existing DB spec case so the
      reversed availability range asserts VALIDATION_FAILED both on create and on an update that makes only one
      bound invalid.
F2 PERMISSION COUNT (K-W3): implementation/test/core/core-authority.spec.ts:60 - replace the literal 16 with
  CORE_PERMISSION_KEYS.length imported from core/permission-registry. Change nothing else in that file. Then
  search implementation/test for any other literal that encodes the permission count or order and report each hit
  (fix only ones that are exactly the same kind of count literal).
VERIFY (offline): prisma validate, tsc --noEmit, jest for database-free specs only; DB specs NOT RUN (K3-G1).
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260922_CODEX_K3B_CATALOG_CORE_FIXES_REPORT.md; append only to
  mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: implementation/core/catalog-item-service.ts, implementation/core/error-adapter.ts,
  implementation/test/core/k3-*.spec.ts, implementation/test/core/core-authority.spec.ts (line 60 and its import
  only), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only).
FORBIDDEN: the migration and schema; any other file; Docker; database; network; main; push; git config.
```

## ۵. پس از K3b

نگهبان دوباره کل مجموعه را روی دیتابیس دور‌ریختنی اجرا می‌کند. اگر سبز بود، ادغام در main با **تصویب مالک**. پس از ادغام، **هیچ ساخت دوباره‌ی کانتینر** تا اعمال محلی کنترل‌شده با پشتیبان و اجازه‌ی جدا (K-W1).

من کلاد هستم
