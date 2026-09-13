# نتایج اعتبارسنجی G7b

## نتیجهٔ نهایی

`PASS`

| کنترل | نتیجه |
|---|---|
| pre-state در مقایسه با G7 | PASS — پنج migration، ده جدول و شمارها برابر |
| پشتیبان داخل کانتینر | PASS — فرمت سفارشی، ۲۲۲۴۲ بایت |
| قابلیت خواندن پشتیبان | PASS — ۶۸ خط object در `pg_restore --list` |
| تطبیق SHA-256 کانتینر/میزبان | PASS |
| migration در انتظار پیش از deploy | PASS — فقط `20260913010000_add_core_foundation` |
| deploy | PASS — فقط همان migration اعمال شد |
| ledger پس از deploy | PASS — ۶ کامل، ۰ rollback |
| داده‌های قبلی | PASS — شمار همهٔ جدول‌های قبلی ثابت؛ ledger از ۵ به ۶ |
| جدول‌های تازهٔ Core | PASS — ۱۲ جدول حاضر و خالی |
| C1 تا C5 | PASS — پنج ایندکس جزئی حاضر |
| C6 تا C11 و دیگر CHECKهای مصوب | PASS — ۲۹ CHECK حاضر |
| Triggerها | PASS — ۱۳ Trigger غیرسیستمی Core؛ allow-list حساس ۱۲ از ۱۲ |
| کلیدهای خارجی Core | PASS — ۳۰ مورد، همگی `ON DELETE RESTRICT / ON UPDATE RESTRICT` |
| ExternalWorkspaceLink | PASS — `external_workspace_link_active_unique` حاضر |
| وضعیت Prisma | PASS — شِما به‌روز است |
| پایگاه داده | PASS — running، healthy، restart صفر |
| API خواندنی V1 | PASS — running، restart صفر، درخواست بدون token برابر 401 |
| نصب Prisma در `_PUSH_STAGING` | PASS — چهار اثر انگشت پیش و پس دقیقاً برابر |
| پاک‌سازی | PASS — فایل موقت dump و worktree موقت حذف شدند؛ پشتیبان میزبان حفظ شد |

## پشتیبان قابل بازیابی

- مسیر: `C:\Users\galexy\mlino-backups\mlino_v1_pre_core_20260913T121927Z.dump`
- اندازه: `22242` بایت
- SHA-256: `f3d2208ad55ad4e19ee2d4c458d85d41694cc8ac0eb082784283381b049b3c09`
- شمار فهرست بازیابی: `68`

## رخدادهای غیرشاهد

سه اجرای فقط‌خواندنی به‌دلیل انتخاب پورت داخلی به‌جای پورت میزبان و سپس PATH نامناسب Git Bash ناموفق بودند. هیچ‌یک تغییری در دیتابیس یا نصب Prisma ایجاد نکردند و به‌عنوان شاهد PASS استفاده نشده‌اند. در پاک‌سازی، بررسی مستقیم worktree از context کاربر escalated با اخطار مالکیت Git رد شد؛ حذف از repository ثبت‌شده موفق بود و نبود مسیر و فهرست نهایی worktreeها ثبت شد. جزئیات در `logs/validation-incidents.log` است.

## تصمیم rollback

کنترل‌های اجباری a تا e همگی PASS شدند؛ بنابراین شرط اجرای rollback فعال نشد. فایل پشتیبان برای بازگشت احتمالی آینده حفظ شده است.

من کدکس هستم.
