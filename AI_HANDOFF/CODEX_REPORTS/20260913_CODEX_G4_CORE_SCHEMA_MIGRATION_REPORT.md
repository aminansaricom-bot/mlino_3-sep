# گزارش اجرای G4 — شِما و migration بنیاد Core

**تاریخ:** ۲۰۲۶-۰۹-۱۳  
**INSTRUCTION_ID:** `CODEX-20260913-G4-CORE-SCHEMA-MIGRATION-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`  
**REVIEW_REFERENCE:** `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G3B_CCR_FIXES.md@94a70ce10cb95a0d5bade8624a93db076fb3d8c0`  
**OWNER_APPROVAL:** `CCR Core Foundation Schema at fcddfc2 is APPROVED`  
**DELIVERY_COMMIT:** `3853f9755bf0c3ee7a40d97baf00ff236b127f63`

## ۱. Task اجراشده

CCR مصوب Core Foundation به شِمای Prisma اعمال شد. ۱۲ مدل و ۱۵ enum مصوب به‌صورت افزودنی وارد `schema.prisma` شدند، migration ششم محصول ساخته شد، Prisma و Client دقیقاً روی نسخهٔ 5.22.0 ثابت شدند و کل زنجیره روی PostgreSQL 16 یک‌بارمصرف اعتبارسنجی شد. هیچ کد سرویس یا Repository نوشته نشد.

## ۲. اسناد منبع

- بازبینی Guardian در `origin/main` با Commit `94a70ce10cb95a0d5bade8624a93db076fb3d8c0`
- CCR مصوب در Commit `fcddfc2ef2faf76a2d6f8ded7eb4f68ec07a71cb`
- شواهد ثابت G3b در `mlino2/validation/g3b/**`
- Handoff زنده `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`

## ۳. فایل‌های تغییرکرده

- `implementation/prisma/schema.prisma`: فقط افزودن بلوک دقیق §۵٫۲ CCR، ۴۱۸ خط افزوده و صفر خط حذف.
- `implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql`: migration تازه شامل header ردیابی، SQL تولیدی Prisma و SQL دستی دقیق §۶.
- `implementation/package.json` و `implementation/package-lock.json`: فقط pin دقیق `prisma` و `@prisma/client` روی `5.22.0`.
- CCR: فقط وضعیت `APPROVED` و یک خط ارجاع به تصویب مالک.
- `mlino2/validation/g4/**`: شواهد، اسکریپت‌های بازتولید، SQL آزمون و logهای G4.

فهرست ۳۶ artifact تحویل و SHA-256 آن‌ها بر مبنای بایت‌های `git show` در `mlino2/validation/g4/SHA256SUMS.txt` ثبت شده است.

## ۴. فایل‌های تغییرنکرده

- هر پنج migration قبلی و `migration_lock.toml`
- تمام serviceها، Repositoryها، APIها و تست‌های برنامه
- `implementation/shared-contracts/**` و فایل منجمد `types.ts`
- `ExternalWorkspaceLink` و نبود FK جدید به `external_workspace_links`
- `mlino2/validation/g3/**` و `mlino2/validation/g3b/**`
- ADRها، `mlino_book/**` و فایل‌های ریشهٔ `AI_HANDOFF`
- شاخهٔ V2 و `main`

## ۵. تست‌ها و اعتبارسنجی‌های اجراشده

- `npm install --package-lock-only --ignore-scripts`
- Prisma 5.22.0: `validate`
- `migrate diff` برای تولید migration و مقایسه با SQL مصوب G3b
- `migrate deploy` هر شش migration روی دیتابیس خالی PostgreSQL 16.14
- `migrate diff` پس از deploy برای بررسی drift
- `base-assertions.sql` برای C1 تا C15 و سیاست FK
- `t1-t12.sql` برای lifecycle، publication، D6 و allow-list دوازده Trigger
- W1 از مسیر Prisma Client موقت
- inventory اشیای محافظت‌شده
- fingerprint چهار پوشهٔ Prisma پیش و پس از اجرا
- پاک‌سازی container و `g4-tooling`

## ۶. نتایج تست

- Prisma schema validation: **PASS**
- SQL تولیدی در G4 و G3b: **PASS — برابر بایت‌به‌بایت**
- شش migration از دیتابیس خالی: **PASS**
- drift پس از migration: **PASS — empty migration**
- C1 تا C15 و SQLSTATEهای مورد انتظار: **PASS**
- T1 تا T12 و allow-list دقیق ۱۲ Trigger: **PASS**
- W1 tenant isolation: **PASS — Prisma P2003**
- fingerprint نصب Prisma: **PASS — بدون تغییر**
- teardown: **PASS — container باقی‌مانده صفر، پوشهٔ موقت حذف شد**

build، type-check و test کامل V1 روی Client تازه اجرا نشد؛ این مورد طبق دستور صریح G4 به دروازهٔ بعدی موکول است.

## ۷. Commit hash

Commit اجرایی:

`3853f9755bf0c3ee7a40d97baf00ff236b127f63`

Commit گزارش و Handoff پس از ثبت این گزارش ساخته می‌شود و در پاسخ نهایی اعلام خواهد شد.

## ۸. ریسک‌های باقی‌مانده

- سازگاری build، type-check و test کامل V1 با Prisma Client بازتولیدشده هنوز در این Gate سنجیده نشده است.
- Triggerهای C15 به فهرست بستهٔ ۱۲ Trigger و بازبینی اجباری migrationهای آینده متکی‌اند؛ این ریسک پذیرفته‌شدهٔ D1 است.
- هیچ ادغام با `main` انجام نشده و تحویل تا بازبینی Guardian روی شاخهٔ مستقل باقی می‌ماند.

## ۹. پرسش‌های باز

پرسش معماری تازه‌ای ایجاد نشد. تصمیم‌گیری دربارهٔ Gate بعدی، آزمون کامل V1 و هر ادغام احتمالی در اختیار Architecture Guardian و مالک است.

## ۱۰. گام پیشنهادی بعدی

Architecture Guardian باید Commit اجرایی، migration، شواهد G4 و این گزارش را مستقل بازبینی کند. Codex پس از Push متوقف می‌شود و هیچ آزمون یا مرحلهٔ بعدی را بدون دستور تأییدشده شروع نمی‌کند.

من کدکس هستم.
