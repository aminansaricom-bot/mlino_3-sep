# گزارش اجرای Q8-3 — ایندکس یکتای پروفایل منتشرشده در پایگاه محلی

## ۱. کار اجراشده

طبق `CODEX-20260917-Q8-3-LOCAL-INDEX-MIGRATION-001` و تأیید صریح مالک برای خواندن فقط-حافظه‌ای `DATABASE_URL` در Q8-3، فقط migration `20260917010000_add_business_profile_published_unique` روی `mlino-v1-local-db` اعمال شد. پیش از اجرا، پشتیبان سفارشی PostgreSQL ساخته و hash نسخهٔ داخل container با نسخهٔ میزبان تطبیق داده شد. نتیجه: **PASS**. این گزارش برای بازبینی Architecture Guardian است؛ مرحلهٔ بعدی آغاز نشده است.

## ۲. منابع و پیش‌شرط‌ها

- مرجع دستور: `AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_Q8_MERGE_Q8_3_RELEASE.md` در commit `0bc1eb4d7dd6c3df4d2b24b0769bd6dd0c4fdaa5`؛ SHA-256 بایت‌های `git show` برابر `5d0cd64050deb4201414068f0e8a6df032e24e1f57b1b40bfc51136ea06e19f8`.
- `git fetch origin` در sandbox به‌دلیل عدم دسترسی شبکه شکست خورد. تلاش elevated به خطای مالکیت مخزن رسید. هیچ credential، تنظیم Git یا `safe.directory` تغییر نکرد.
- GW2-P: `git cat-file -e <pinned>^{commit}` → PASS؛ `git merge-base --is-ancestor <pinned> origin/main` → PASS؛ `git show <pinned>:<review> | sha256sum` → hash دقیق بالا، PASS.
- `git rev-parse 736bf2d:implementation/prisma` و `git rev-parse e0348a1:implementation/prisma` هر دو `a211ed76e73f29113024562b474fb8f79b2a0023`؛ `implementation/` تمیز؛ Prisma CLI نسخهٔ `5.22.0`.
- C0: فقط یک خط اتصال از فایل مجاز خوانده و در حافظه اعتبارسنجی شد؛ خروجی ثبت‌شده فقط `C0_LINES=1 HOST_LOCAL=true PORT=5435 DB=mlino_v1` است. مقدار اتصال و رمز ثبت نشدند و متغیر پس از اجرای فرایندهای مجاز نگه داشته نشد (`DATABASE_URL_RETAINED=false`).

## ۳. فایل‌های تغییرکرده و تغییرنکرده

- تازه: `mlino2/validation/q8-3/`، شامل اسکریپت اجرایی، لاگ‌های پیش/پس، دو توقف اولیه و فهرست hash شواهد.
- تازه: همین گزارش.
- فقط افزودنی: `mlino2/HANDOFF/HANDOFF_STATE.md`.
- هیچ فایل محصول، schema، migration، آزمون، V2، `main` یا تنظیم Git تغییر نکرد. روی دیتابیس زنده هیچ آزمونی اجرا نشد.

## ۴. اجرا و نتیجهٔ گام‌ها

| گام | نتیجه |
|---|---|
| ۰، اتصال | یک خط مجاز؛ host محلی، پورت 5435، پایگاه `mlino_v1`؛ فقط انتقال در حافظه به فرایند Prisma |
| ۱، منبع | درخت Prisma دو commit برابر، worktree بخش `implementation/` تمیز، CLI = 5.22.0 |
| ۲، پیش‌وضعیت | ۷ migration پایان‌یافته و هیچ‌کدام rollback نشده؛ شمار همهٔ جدول‌های public ثبت شد؛ گروه پروفایل منتشرشدهٔ تکراری = ۰؛ ایندکس هنوز وجود نداشت؛ ۱۳ trigger و ۳۰ CHECK |
| ۳، پشتیبان | `pg_dump -Fc -f` داخل container، `pg_restore --list` با ۲۱۵ مورد، `docker cp`، hash یکسان در دو طرف؛ فایل موقت داخل container پاک شد |
| ۴، وضعیت migration | دقیقاً همین یک migration در انتظار بود. خروجی `migrate status` با کد ۱، مطابق معنای «migration در انتظار»، ثبت شد؛ این کد به‌عنوان deploy ناموفق تفسیر نشد |
| ۵، deploy | `prisma migrate deploy` دقیقاً یک بار اجرا شد؛ کد خروج ۰ و پیام موفقیت ثبت شد |
| ۶، راستی‌آزمایی | هر شش بررسی a تا f در بخش بعد PASS |
| ۷، مسیر شکست | لازم نشد؛ `migrate resolve` و restore اجرا نشدند |

نام پشتیبان: `C:\Users\galexy\mlino-backups\mlino_v1_pre_q8_20260917T202400Z.dump`، اندازه: **۱۰۳٬۹۸۰ بایت**. SHA-256 داخل container و روی میزبان یکسان است: `3ed1d514caf5e196dbfb95f4087910167fbd748b6d3b48af7cfc3cf8ae06300c`. فایل پشتیبان در مخزن قرار ندارد.

## ۵. نتیجهٔ بررسی‌های a تا f

| بررسی | شاهد و نتیجه |
|---|---|
| a | ۸ migration، همگی FINISHED و NOT_ROLLED_BACK |
| b | ایندکس `business_profile_one_published_per_organization_unique` وجود دارد، UNIQUE و معتبر است و شرط `publication_status = 'PUBLISHED'` دارد |
| c | شمار ردیف تمام جدول‌های دادهٔ public قبل و بعد برابر است؛ تنها ردیف ثبت migration در `_prisma_migrations` اضافه شد |
| d | شمار triggerهای غیرسیستمی همچنان ۱۳ و CHECKها همچنان ۳۰ است |
| e | image، زمان شروع و شمار restart هر دو container پایگاه داده و read-api بدون تغییر است |
| f | درخواست بدون احراز هویت به read-api همچنان `401` می‌گیرد |

## ۶. اعتبارسنجی و حوادث

- هیچ آزمون V1/Core روی پایگاه محلی اجرا نشد؛ اعتبارسنجی این کار شامل پیش‌بررسی و سنجش‌های پس از migration بود.
- تلاش اول در کد محلی اسکریپت، به‌دلیل برخورد نام متغیر با متغیر خودکار PowerShell، **پیش از اتصال به دیتابیس، پشتیبان‌گیری و migration** متوقف شد. لاگ `attempt1-stop.log` حفظ شد؛ فقط نام متغیر اصلاح شد.
- تلاش دوم در تجزیهٔ خروجی `docker inspect`، **پیش از هر query دیتابیس، پشتیبان‌گیری و migration** متوقف شد. لاگ `attempt2-stop.log` حفظ شد؛ خروجی inspect پیش از split به یک scalar سپرده شد.
- تلاش سوم از ابتدا اجرا و موفق شد. هیچ retry برای `migrate deploy` رخ نداد.
- تمام فایل‌های `.log` از نظر الگوی نشانی اتصال و رمز بررسی شدند؛ نتیجهٔ `redaction-check.log` برابر PASS است. اسکریپت صرفاً الگوهای تشخیص/پالایش را دارد و مقدار واقعی اتصال را ذخیره نمی‌کند.

## ۷. SHA-256 شواهد

`mlino2/validation/q8-3/LF-MANIFEST.txt` شامل مسیر و SHA-256 **هر ۲۵ فایل شواهد دیگر** است. تمام ۲۵ مقدار با `git show HEAD:<path> | sha256sum` دوباره سنجیده شد: `MANIFEST_25_OF_25_PASS`. SHA-256 خود manifest روی بایت‌های Git: `271682ba3d8f25aa32b5b1b0c461914ef5a8e4678fec0ed2c400f6712ebb744c`.

جدول زیر نام فایل را نسبت به `mlino2/validation/q8-3/` نشان می‌دهد؛ hashها از بایت‌های ثبت‌شده در Git هستند:

| فایل | SHA-256 |
|---|---|
| `apply-local-index.ps1` | `6643ce3e85ab2ae734f132c554afe2215227d9cf26981b3f79a71bb95340cb2a` |
| `attempt1-stop.log` | `167d4725c61f9c45212b054b31d010a20689af3cb3dc99ce4d937eb1f727dc79` |
| `attempt2-stop.log` | `38c66d9e8963972164ab40cd3892ee9ec26ac66a3a6e1ceebf3a1a5947cbcdff` |
| `backup-b3.log` | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` |
| `backup-b4.log` | `29cefd7e34bb5c6609e451784bbbe94cdada917638e514b183f4b66bde1ba923` |
| `backup-b5.log` | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` |
| `backup-b6.log` | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` |
| `backup-summary.log` | `1ba663fdaf5d47953fba965205881bb3f9b28c356ca854136debd2aff4dfd03c` |
| `c0.log` | `5bdc4169fb380632a2ff74cd672d83de5375a0a3fb24e7ecf7b88973b72eecee` |
| `execution-error.log` | `fb7a839a72b845f9e6e979ff058bed82b524dfbd145fab5fdbbd74449e93fd3d` |
| `execution-summary.log` | `9cdb9cdb7ea274a8e3ea5c99145f8397cd284677b07dbd33cc57dfbd18f63d50` |
| `execution.log` | `2609ea28167a09065cde07374ecae60dbed9dda7348abc89f09216cf29e815b6` |
| `migrate-deploy.log` | `5c2f91f82aaaab11bcb3402498ec6ff9e9414615fc7061a2b93a3a594b216102` |
| `migrate-status.log` | `3956cdb95db4578e21758242e786a3232ee5fefe15ac76d1746f66de86fec224` |
| `post-containers.log` | `978751891b299022c08aae9adea23ca16e37960c2da2c5d31cedd766460c132c` |
| `post-index-and-constraints.log` | `5e88d6841aabe8f97f98d5ce76f0d9eefa70bbf02d0e247a63801e71c4e809d5` |
| `post-migrations.log` | `540f5c80e90c31277933e2ef8853cbeef61814266076043ef5233879bd2a6015` |
| `post-table-counts.log` | `a3e240f2a00fdc49d6e16918d9f7f6e763ae8d71e31de178788c7c6016d593b0` |
| `pre-containers.log` | `978751891b299022c08aae9adea23ca16e37960c2da2c5d31cedd766460c132c` |
| `pre-migrations.log` | `f203e4b2b3684189f408f31de915d6bc922144610ca6d0ab3d58a8e60b0039e6` |
| `pre-table-counts.log` | `b6842bdd38dc4fb344426d7eb6490784baa887f9f10933586c250634b3083818` |
| `preflight.log` | `dbc541a45b7d0745fc3d6236b1ff804a9d911df7c20369790d2609d2e2c95f4b` |
| `read-api-http.log` | `1e91b254890805c5025f98247bde994fbf6989972c9bc1dda2b5b9b26446de15` |
| `redaction-check.log` | `388e526a48919e872d80f719512f72ff09835419e93369a012ef305fd9f5d1c9` |
| `source-check.log` | `923b9014a567a6e886d0d4b2f21260624665d7fbb874e8bc51b78a62c5d1037f` |

## ۸. Commit

- `53cef38` — اسکریپت و لاگ‌های اجرای Q8-3.
- `8bf18a1` — manifest شواهد.
- گزارش و ورودی Handoff در commit تحویل جداگانه ثبت می‌شوند؛ هیچ push انجام نمی‌شود.

## ۹. ریسک‌ها و پرسش‌های باز

- پشتیبان در مسیر اعلام‌شدهٔ میزبان موجود است؛ بازیابی آن بدون دستور و تصویب جداگانه مجاز نیست.
- اکنون ایندکس یکتای جزئی در پایگاه محلی برقرار است. این گزارش هیچ ادعایی دربارهٔ محیط‌های دیگر ندارد.
- پرسش اجرایی تازه‌ای برای همین migration باقی نمانده؛ پذیرش نهایی شواهد با Architecture Guardian است.

## ۱۰. گام پیشنهادی و توقف

Architecture Guardian این گزارش، manifest، پشتیبان و وضعیت migration را بازبینی کند. تا صدور دستور بعدی، هیچ کار G14c، push، آزمون یا تغییر پایگاه داده انجام نمی‌شود.

من کدکس هستم
