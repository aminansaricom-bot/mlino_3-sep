# فرمان‌ها و ترتیب اجرای G7b

## ۱. کنترل پیش‌شرط‌ها

- `git fetch origin`
- خواندن بازبینی G7 و G7b و تصویب مالک از `origin/main` با `git show`
- بررسی تمیزی شاخهٔ `codex/core-prisma-foundation`
- خواندن وضعیت کانتینر، ledger migration و شمار ردیف‌های تمام جدول‌های `public`
- مقایسهٔ خروجی تازه با شواهد تغییرناپذیر G7

## ۲. پشتیبان B1 تا B6

1. ساخت و بررسی مسیر بیرونی پشتیبان.
2. ساخت timestamp UTC با فرهنگ ثابت و کنترل الگوی آن.
3. اجرای مستقیم `pg_dump -Fc -f /tmp/<file>` داخل کانتینر.
4. محاسبهٔ SHA-256 و اجرای `pg_restore --list` داخل کانتینر.
5. انتقال فایل با `docker cp` و تطبیق hash میزبان با hash کانتینر.
6. حذف فقط فایل موقت داخل کانتینر و حفظ فایل میزبان.

هیچ credential چاپ یا ذخیره نشد و خروجی `pg_dump` از shell میزبان عبور نکرد.

## ۳. migration

- ساخت worktree موقت و detached از `origin/main@f40a3f5ff68337682ddc659be658807225f25bc1`.
- استفادهٔ فقط‌خواندنی از Prisma CLI نسخهٔ 5.22.0 در `_PUSH_STAGING` با `CHECKPOINT_DISABLE=1` و `PRISMA_GENERATE_SKIP_AUTOINSTALL=1`.
- `prisma migrate status`: دقیقاً یک migration در انتظار بود.
- `prisma migrate deploy`: فقط `20260913010000_add_core_foundation` اعمال شد.
- `prisma migrate status`: شِما به‌روز گزارش شد.

مقادیر اتصال فقط در حافظهٔ فرایند از environment کانتینر خوانده شدند و در شواهد ثبت نشدند.

## ۴. کنترل پس از migration

- اجرای `sql/post_migration_validation.sql` با `psql` در حالت فقط‌خواندنی.
- اجرای `scripts/validate-post-state.ps1` برای مقایسهٔ پیش و پس.
- بررسی `pg_trigger` برای مجموعهٔ دقیق ۱۳ Trigger غیرسیستمی Core، شامل allow-list بستهٔ ۱۲ Trigger حساس.
- بررسی پاسخ API در مرز احراز هویت: `HTTP 401` برای درخواست بدون token.
- محاسبهٔ دوبارهٔ چهار اثر انگشت Prisma و تطبیق کامل با مقدار پیش از اجرا.
- حذف worktree موقت و اجرای `git worktree prune`.

## ۵. عملیات ممنوعی که انجام نشد

- تست‌های V1 روی پایگاه محلی اجرا نشد.
- `docker compose build`، `up --build`، `down -v`، حذف volume، `DROP`، `TRUNCATE` یا `DELETE` اجرا نشد.
- image یا سرویس بازسازی/راه‌اندازی مجدد نشد.
- هیچ فایل تولیدی، schema، migration، backend، ADR، main یا شاخهٔ V2 تغییر نکرد.

من کدکس هستم.
