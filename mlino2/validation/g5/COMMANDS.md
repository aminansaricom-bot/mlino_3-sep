# روش اجرای G5

1. ساخت دو worktree موقت detached در `%TEMP%` برای `6b62509` و `f47c852`.
2. اجرای `npm ci` از lockfile در `implementation/` هر worktree.
3. اجرای `npx --no-install prisma generate` با telemetry و auto-install غیرفعال.
4. اجرای `npm run build` و شمارش خطاهای TypeScript.
5. اجرای دو PostgreSQL 16 مستقل با `--rm` و `--tmpfs`، بدون named volume.
6. اعمال ۵ migration برای مبنا و ۶ migration برای G4.
7. اجرای `npm test -- --runInBand` با اتصال موقت مختص هر container.
8. مقایسهٔ مجموعهٔ فایل‌های تست موفق و تعداد تست‌ها.
9. فهرست‌کردن `Prisma.ModelName` و بررسی حفظ ۸ مدل قدیمی و افزوده‌شدن ۱۲ مدل Core.
10. توقف containerها، حذف اجباری دو worktree موقت و اجرای `git worktree prune`.

رشته‌های اتصال فقط در متغیر محیطی فرایند بودند و در فایل‌ها یا logها ذخیره نشدند. یک تلاش اضافی `npm ci --offline` در sandbox به‌علت عدم دسترسی به cache محلی رد شد؛ نتیجهٔ محصول محسوب نشد و نصب عادیِ مجاز در هر دو worktree با exit code صفر تکرار و ثبت شد.

من کدکس هستم.
