# نتایج اعتبارسنجی G8

## وضعیت نهایی

`PASS`

| کنترل | نتیجه |
|---|---|
| pre-state | PASS — DB سالم، شش migration، ۲۲ جدول |
| پشتیبان B1 تا B6 | PASS — hash برابر و فایل موقت حذف شد |
| tag بازگشت | PASS — image قبلی با digest مورد انتظار |
| build از origin/main | PASS |
| v1-migrate | PASS — بدون migration معلق |
| ledger | PASS — شش migration کامل |
| داده‌ها | PASS — شمار ردیف‌ها با pre-state یکسان |
| DB container | PASS — بازسازی نشد، StartedAt ثابت، restart صفر |
| DB volume | PASS — `implementation_mlino_v1_local_db_data` ثابت |
| read-api image | PASS — digest جدید با digest pre-g8 متفاوت است |
| read-api logs | PASS — الگوی خطای Prisma یافت نشد |
| API boundary | PASS — درخواست بدون token برابر 401 |
| پاک‌سازی | PASS — worktree موقت حذف و prune شد |

## پشتیبان

- مسیر: `C:\Users\galexy\mlino-backups\mlino_v1_pre_g8_20260913T125154Z.dump`
- اندازه: `103407` بایت
- SHA-256: `88e22257ecd64a19e3388fc2f1356b147e7e818707994613671a25fa09f0570f`

## رخدادهای غیرشاهد

یک بار اجرای پرس‌وجوی inline شمار جدول‌ها به‌دلیل quoting ناموفق شد و هیچ تغییری ایجاد نکرد. یک بار نیز parser محلی logها offset و الگوی migration را اشتباه داشت؛ پس از اصلاح، اجرای مستقل همان validation برابر `PASS` شد. هر دو رخداد فقط خواندنی و در `logs/validation-incidents.log` ثبت شده‌اند.

## rollback

هیچ‌یک از کنترل‌های hard stop شکست نخورد؛ rollback اجرا نشد. image بازگشت و پشتیبان برای تصمیم بعدی حفظ شده‌اند.

من کدکس هستم.
