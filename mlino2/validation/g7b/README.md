# شواهد اجرای G7b — اعمال migration شِمای Core روی پایگاه محلی V1

## دامنه

این بسته اجرای دستور `CODEX-20260913-G7B-APPLY-CORE-MIGRATION-LOCAL-RETRY-001` را ثبت می‌کند. فقط migration زیر روی `mlino-v1-local-db` اعمال شد:

`20260913010000_add_core_foundation`

پیش از migration، پشتیبان PostgreSQL با فرمت سفارشی داخل کانتینر ساخته، بررسی و سپس با `docker cp` به مسیر بیرون از مخزن منتقل شد. خروجی `pg_dump` از shell میزبان pipe یا redirect نشد.

## نتیجه

وضعیت: **PASS**

- پنج migration قبلی به شش migration کامل و بدون rollback رسید.
- شمار ردیف‌های تمام جدول‌های قبلی، به‌جز ledger migration که از ۵ به ۶ رسید، ثابت ماند.
- ۱۲ جدول تازهٔ Core ساخته شدند و همگی خالی‌اند.
- ایندکس‌ها، CHECKها، Triggerها و کلیدهای خارجی مصوب حاضرند.
- وضعیت Prisma برابر `Database schema is up to date` است.
- پایگاه داده سالم و API خواندنی V1 در حال اجراست.
- اثر انگشت نصب Prisma در `_PUSH_STAGING` پیش و پس از اجرا یکسان است.
- worktree موقت حذف و prune شد.

## پشتیبان

- مسیر: `C:\Users\galexy\mlino-backups\mlino_v1_pre_core_20260913T121927Z.dump`
- اندازه: `22242` بایت
- SHA-256 داخل کانتینر و میزبان: `f3d2208ad55ad4e19ee2d4c458d85d41694cc8ac0eb082784283381b049b3c09`
- تعداد خطوط فهرست `pg_restore --list`: `68`

فایل dump شامل داده است و عمداً در مخزن قرار ندارد.

## محتوا

- `logs/`: خروجی‌های بدون credential و بدون دادهٔ ردیفی
- `sql/post_migration_validation.sql`: پرس‌وجوهای فقط‌خواندنی موجودی و شمارش
- `scripts/validate-post-state.ps1`: کنترل قطعی post-state
- `scripts/fingerprint-prisma-install.sh`: محاسبهٔ اثر انگشت با روش مصوب Guardian
- `COMMANDS.md`: شرح عملیات اجراشده
- `VALIDATION_RESULTS.md`: نتیجهٔ کنترل‌ها و رخدادهای غیرشاهد

من کدکس هستم.
