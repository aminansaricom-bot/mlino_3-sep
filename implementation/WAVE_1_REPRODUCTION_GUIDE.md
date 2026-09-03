# راهنمای بازتولید Wave 1 (برای بازبین مستقل، روی یک ماشین تمیز)

هیچ رازی در این راهنما نیست. مقادیر `.env` نمونه (`mlino`/`mlino_dev_local`) فقط برای Postgres محلی توسعه هستند، نه یک راز واقعی محیط تولید.

## پیش‌نیازها

- Node.js ≥ 18 (این بسته با v24.18.0 ساخته و آزموده شده)
- npm
- Docker + Docker Compose (برای Postgres محلی)

## مراحل

```bash
cd implementation

# ۱) نصب وابستگی‌ها
npm install

# ۲) بالا آوردن Postgres محلی (پورت 5435، عمداً غیر‌متداخل با نمونه‌های دیگر سیستم)
npm run db:up

# ۳) تنظیم .env (کپی نمونه؛ بدون راز واقعی)
cp .env.example .env

# ۴) اعمال Migration و تولید Prisma Client
npx prisma migrate deploy
npx prisma generate

# ۵) بررسی نوع (باید بدون خروجی و Exit Code 0 باشد)
npx tsc --noEmit -p tsconfig.json

# ۶) اعتبارسنجی Schema
npx prisma validate

# ۷) اجرای کل مجموعه‌ی تست (باید ۷ Suite / ۳۷ تست، همگی PASS)
npx jest

# ۸) بررسی‌های مرزی معماری (باید هرکدام بدون خروجی/صفر تطابق باشند)
grep -rn "from '\.\./\.\./value-engines\|from '\.\./\.\./feed\|from '\.\./\.\./briefing" value-engines/ feed/ briefing/
grep -rln "prisma-client\|@prisma/client" value-engines/ feed/ briefing/
grep -rn "prisma\.eventLog\.\(create\|update\|upsert\|delete\)" --include="*.ts" .
grep -rn "new PrismaClient" --include="*.ts" .

# ۹) خاموش کردن زیرساخت محلی
npm run db:down
```

## نتیجه‌ی مورد انتظار

- مرحله‌ی ۵: خروجی خالی
- مرحله‌ی ۶: «The schema at prisma\schema.prisma is valid»
- مرحله‌ی ۷: `Test Suites: 7 passed, 7 total` / `Tests: 37 passed, 37 total`
- مرحله‌ی ۸: هر چهار دستور grep باید صفر تطابق تولیدی بدهند (تطابق‌های grep دوم فقط باید در `foundation/prisma-client.ts` باشند اگر روی کل درخت اجرا شود؛ در این‌جا محدود به `value-engines/feed/briefing` است که باید کاملاً خالی باشد)

## نکته درباره‌ی `maxWorkers: 1`

`jest.config.js` عمداً `maxWorkers: 1` دارد چون تمام فایل‌های Spec یک Postgres واقعی و مشترک را استفاده می‌کنند و پاک‌سازی سراسری (`afterEach`) هر فایل با نوشتن هم‌زمان فایل دیگر زیر اجرای موازی پیش‌فرض Jest تداخل می‌کند (جزئیات در کامنت خودِ فایل). این یک تنظیم پیکربندی تست است، نه یک محدودیت معماری تولید.

## اجزای خارج از این راهنما (به‌عمد)

- هیچ لایه‌ی HTTP/API واقعی برای فراخوانی دستی وجود ندارد — Wave 1 فقط سرویس‌های TypeScript است، بدون Route/Controller.
- FP-02 (پیاده‌سازی واقعی IC-14) ساخته نشده؛ نمی‌توان F-04/F-05 را با داده‌ی واقعی Postgres آزمود — فقط با `MockIC14ReadInterface` (که همان تست‌های موجود آن را اجرا می‌کنند).
