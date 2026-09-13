# نتیجهٔ G7

**وضعیت نهایی:** BLOCKED

| مرحله | نتیجه |
|---|---|
| سلامت `mlino-v1-local-db` | PASS — running و healthy |
| restart count | ۰ |
| migrationهای پیش از اجرا | PASS — دقیقاً ۵ مورد مورد انتظار |
| شمارش جدول‌های public | PASS — ۱۰ جدول، فقط نام و تعداد ثبت شد |
| ساخت مسیر پشتیبان | FAIL — پارامتر ناسازگار PowerShell |
| ساخت فایل پشتیبان | انجام نشد |
| بررسی `pg_restore --list` | انجام نشد |
| fingerprint Prisma | انجام نشد؛ مرحلهٔ ۳ آغاز نشد |
| اعمال migration ششم | انجام نشد |
| rollback | لازم نشد؛ دیتابیس تغییر نکرد |

راستی‌آزمایی پس از hard stop نشان داد دیتابیس همچنان سالم است و فقط همان پنج migration قبلی را دارد. مسیر `C:\Users\galexy\mlino-backups` نیز ساخته نشده است.

من کدکس هستم.
