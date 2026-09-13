# ترتیب اجرای G8

۱. `git fetch origin` و خواندن بازبینی رسمی G7b و تصویب G8 از `origin/main`.

۲. ثبت read-only وضعیت اولیهٔ `mlino-v1-read-api`، `mlino-v1-local-db`، volume، ledger شش migration و شمار جدول‌ها.

۳. پشتیبان B1 تا B6:

- ساخت مسیر بیرون از مخزن و timestamp UTC با فرهنگ ثابت
- اجرای `pg_dump -Fc -f /tmp/<file>` داخل کانتینر
- hash و `pg_restore --list` داخل کانتینر
- انتقال با `docker cp` و تطبیق hash میزبان
- حذف فایل موقت داخل کانتینر

خروجی `pg_dump` از shell میزبان pipe یا redirect نشد.

۴. بررسی image قبلی و ساخت tag بازگشت `mlino-v1-read-api:pre-g8`.

۵. ساخت worktree موقت از `origin/main` و اجرای `docker compose -p implementation up -d --build v1-read-api` فقط از پوشهٔ `implementation` همان worktree.

۶. کنترل‌های پس از rebuild:

- `v1-migrate` پیام `No pending migrations to apply` داد.
- ledger همچنان شش migration است.
- شمار ردیف‌ها با pre-state برابر است.
- `StartedAt` و volume DB ثابت‌اند.
- image API تغییر کرده و لاگ API خطای Prisma ندارد.
- درخواست بدون token پاسخ 401 داد.

۷. worktree موقت حذف و prune شد؛ tag `pre-g8` و پشتیبان حفظ شدند.

فرمان‌ها هیچ credential یا دادهٔ ردیفی را در log ثبت نکردند.

من کدکس هستم.
