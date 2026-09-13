# شواهد G8 — بازسازی Runtime API نسخهٔ V1

این بسته اجرای `CODEX-20260913-G8-V1-RUNTIME-REBUILD-001` را ثبت می‌کند.

## نتیجه

وضعیت: **PASS**

- پشتیبان G8 با فرمت custom قبل از rebuild ساخته شد و hash داخل کانتینر و میزبان برابر است.
- tag بازگشت `mlino-v1-read-api:pre-g8` حفظ شد.
- image تازهٔ API از `origin/main` ساخته و اجرا شد.
- `v1-migrate` بدون migration معلق پایان یافت.
- DB و volume همان قبلی باقی ماندند.
- شمار ردیف‌های همهٔ جدول‌ها ثابت ماند.
- API بدون token پاسخ 401 داد و خطای Prisma در لاگ آن دیده نشد.

## پشتیبان

- مسیر: `C:\Users\galexy\mlino-backups\mlino_v1_pre_g8_20260913T125154Z.dump`
- اندازه: `103407` بایت
- SHA-256: `88e22257ecd64a19e3388fc2f1356b147e7e818707994613671a25fa09f0570f`
- فایل dump خارج از مخزن نگه داشته شده است.

## imageها

- image قبل و tag بازگشت: `sha256:6e092dddeeecbd09579005db577204338b4d9e67d3f1271d5baf3416f6283c84`
- image فعلی API: `sha256:a07858b3da15e63ac0c925c44eaee51903adfdcb6b715cd99dfc1667de10cda8`

## محدودیت دامنه

هیچ تست V1 اجرا نشد، هیچ migration جدیدی اعمال نشد، DB حذف یا بازسازی نشد، volume حذف نشد و `main`، شاخهٔ V2، `implementation/**` و `_PUSH_STAGING` در شاخهٔ Core تغییر نکردند.

من کدکس هستم.
