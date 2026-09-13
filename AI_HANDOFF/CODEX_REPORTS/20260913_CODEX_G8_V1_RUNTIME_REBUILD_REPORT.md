# گزارش اجرای G8 — بازسازی Runtime خواندنی V1

**تاریخ:** ۲۰۲۶-۰۹-۱۳
**INSTRUCTION_ID:** `CODEX-20260913-G8-V1-RUNTIME-REBUILD-001`
**TARGET_HANDOFF_ID:** `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`
**REVIEW_REFERENCE:** `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G7B_LOCAL_MIGRATION.md@789aa67`
**OWNER_APPROVAL:** G8 approved: rebuild the V1 read API image from main and restart it

## ۱. Task اجراشده

پس از کنترل read-only وضعیت G7، از پایگاه محلی V1 پشتیبان مستقل گرفته شد، image قبلی API با tag `pre-g8` حفظ شد، سپس worktree موقت از `origin/main` ساخته و فقط سرویس `v1-read-api` با `docker compose -p implementation up -d --build v1-read-api` بازسازی و اجرا شد.

وضعیت نهایی: **PASS**.

## ۲. اسناد و مرجع‌های استفاده‌شده

- بازبینی Guardian: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G7B_LOCAL_MIGRATION.md@789aa67`
- تصویب مالک G8: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260913_OWNER_APPROVAL_G8_RUNTIME_REBUILD.md`
- Handoff زندهٔ `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`
- `implementation/docker-compose.yml`
- `implementation/prisma/schema.prisma` و زنجیرهٔ migrationها از worktree موقت `origin/main`
- شواهد G7b برای مقایسهٔ وضعیت قبلی

## ۳. فایل‌های تغییرکرده

Commit شواهد G8 فقط شامل `mlino2/validation/g8/**` است و شامل این گروه‌هاست:

- README، ترتیب فرمان‌ها و نتایج اعتبارسنجی
- SQL شمارش جدول‌ها و اسکریپت‌های backup و validation
- logهای pre-state، B1 تا B6، build، migration، runtime و cleanup

در Commit تحویل نهایی، این گزارش و یک ورودی افزودنی در `mlino2/HANDOFF/HANDOFF_STATE.md` ثبت می‌شوند.

## ۴. فایل‌ها و محیط‌های تغییرنکرده

- `implementation/**` در شاخهٔ Core
- `main` و شاخهٔ `codex/v2-intent-flow-foundation`
- `_PUSH_STAGING`
- ADRها، قراردادها و `mlino_book/**`
- migrationهای دیتابیس و داده‌های قبلی
- volume دیتابیس
- `AI_HANDOFF/HANDOFF_STATE.md` ریشه و سایر فایل‌های ریشهٔ AI_HANDOFF

تغییر runtime فقط به build و restart سرویس مجاز `v1-read-api` محدود بود. هیچ تست V1 اجرا نشد و هیچ `down -v`، حذف volume، DROP، TRUNCATE یا DELETE انجام نشد.

## ۵. عملیات پشتیبان و اجرا

- مسیر پشتیبان: `C:\Users\galexy\mlino-backups\mlino_v1_pre_g8_20260913T125154Z.dump`
- اندازه: `103407` بایت
- SHA-256 داخل کانتینر و میزبان: `88e22257ecd64a19e3388fc2f1356b147e7e818707994613671a25fa09f0570f`
- پشتیبان با `pg_dump -Fc -f` داخل کانتینر ساخته شد.
- `pg_restore --list` داخل کانتینر اجرا و فایل موقت بعد از `docker cp` حذف شد.
- tag بازگشت: `mlino-v1-read-api:pre-g8`
- worktree موقت از `origin/main` روی commit `789aa677af737c7cc2dc85d5ffb2e0c2a7bf98da` ساخته شد.

## ۶. تست‌ها و کنترل‌های اجراشده

- pre-state: image، StartedAt، restart، volume، ledger و شمار جدول‌ها
- `v1-migrate` پس از rebuild
- مقایسهٔ شمار ۲۲ جدول قبل و بعد
- ثابت ماندن StartedAt و volume دیتابیس
- تغییر image read API
- جست‌وجوی خطای Prisma در log سرویس
- درخواست بدون احراز هویت به API
- حفظ tag بازگشت و پشتیبان
- حذف و prune worktree موقت

## ۷. نتایج تست

- pre-state: **PASS** — شش migration، ۲۲ جدول و DB سالم
- B1 تا B6: **PASS** — hash برابر، پشتیبان قابل نگهداری، فایل موقت حذف‌شده
- build: **PASS**
- `v1-migrate`: **PASS** — `No pending migrations to apply`
- ledger: **PASS** — شش migration، بدون rollback
- شمار ردیف‌ها: **PASS** — با pre-state یکسان
- DB: **PASS** — StartedAt ثابت، volume ثابت، restart صفر
- read API: **PASS** — image جدید با digest متفاوت از pre-g8
- log API: **PASS** — خطای Prisma یافت نشد
- مرز احراز هویت: **PASS** — HTTP 401
- cleanup: **PASS** — worktree حذف و prune شد

## ۸. Commit hash

Commit شواهد: `134aa0917bbad76a48db0ca35e71c759472591cd`.

Commit گزارش و Handoff پس از ثبت این گزارش و محاسبهٔ SHA-256 محتوای Git اعلام خواهد شد.

شاخهٔ تحویل: `codex/core-prisma-foundation`.

## ۹. ریسک‌ها و پرسش‌های باز

- فایل پشتیبان حاوی داده است و باید خارج از مخزن با دسترسی محدود نگه‌داری شود.
- tag `pre-g8` عمداً باقی مانده تا Guardian در صورت نیاز مسیر rollback را تأیید کند.
- image تازه فقط runtime خواندنی را فعال کرده است؛ هنوز هیچ service یا repository برای مدل‌های Core پیاده‌سازی نشده است.
- انتخاب گام بعدی پس از بازبینی Guardian است.

## ۱۰. گام بعدی پیشنهادی

Architecture Guardian گزارش و شواهد G8 را مستقل بررسی کند. Codex پس از Push متوقف می‌شود و بدون دستور جدید مرحلهٔ دیگری آغاز نمی‌کند.

من کدکس هستم.
