INSTRUCTION_ID: CODEX-20260906-0019-CCR-APPLY-ADAPTER-AUTH
AUTHOR: CODEX
STATUS: EXECUTED
EXECUTED_BY: CLAUDE
EXECUTED_AT: 2026-09-06T01:10:00
RESULTING_HANDOFF_ID: HANDOFF-20260906-CCR-APPLY-AC2-ADAPTER
TARGET_HANDOFF_ID: HANDOFF-20260905-AC2ALIGN-REVIEW-ACK
TARGET_REPORT_PATH: C:\mlino code\AI_HANDOFF\CLAUDE_REPORTS\20260905_AC2ALIGN_CCR_R8_REVIEW_ACKNOWLEDGEMENT.md
TARGET_REPORT_SHA256: 787babc92eeed8dd0e402571106ae52c70ed577aaf7906b9d5a08fbb5bd5cae9
TARGET_ZIP_PATH: (none)
TARGET_ZIP_SHA256: (n/a)
REVIEW_COMPLETED_AT: 2026-09-06T00:19:00
AUTHORIZATION_SCOPE: APPLY_OWNERSHIP_TYPE_CCR_THEN_IMPLEMENT_REAL_AC2_ADAPTER_OPTION1_STAGED

---

# مجوز دو‌مرحله‌ای: اعمال CCR فیلد مالکیت + پیاده‌سازی Adapter واقعی AC-2 (گزینه ۱ عملیاتی)

**صادرکننده:** ممد (بازبین مستقل، GLM 5.3 Flash) — **بر پایه‌ی تصمیم صریح مالک محصول: CCR فیلد مالکیت تصویب شد** (با رویکرد فازبندی‌شده‌ی Admission-fill پیشنهادی یونس)، ۵ سپتامبر ۲۰۲۶.

## ۰. مبنای مصوب

1. **تصویب CCR:** `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_OWNERSHIP_TYPE.md` به‌صورت کامل و بدون تغییر دامنه، مصوب مالک محصول شد. این **تنها مورد مجاز و منتظَر تغییر** در دو فایل منجمد است — هر تغییر دیگری در آن‌ها همچنان ممنوع.
2. **تصمیم باز داخل CCR — حل‌شده (فازبندی):** فاز ۱ = پرکردن مالکیت در مرز Admission (مقدار واحد `ORGANIZATIONAL`)؛ فاز آینده با فعال‌شدن `INDIVIDUAL` = ارسال صریح توسط Producer.
3. **سیاست AC-2:** `V1_MINIMUM_AC2_ACCESS_POLICY.md` v1.1 (قواعد ۱–۱۰ + §۲.۱ مدل دو‌لایه‌ای) — مبنای Adapter.
4. **گپ‌های باز می‌مانند:** R4 (BLOCKED)، R5 (OPEN عمدی)، R8-a/R8-b (OPEN). Adapter هیچ‌کدام را حل نمی‌کند.

## ۱. مرحله‌ی الف — اعمال CCR (دروازه‌ی ورود به مرحله‌ی ب)

1. `prisma/schema.prisma`: افزودن `enum OwnershipType { ORGANIZATIONAL }` + فیلد `ownershipType` با `@default(ORGANIZATIONAL) @map("ownership_type")` روی `EventLog` و `OpportunityCurrentState` — دقیقاً طبق پیش‌نویس CCR (بدون مقادیر رزرو در enum).
2. `shared-contracts/types.ts`: فقط حداقلِ لازم طبق CCR (نوع `OwnershipType` و فیلد متناظر روی DTOهایی که CCR تعریف کرده) — هیچ افزودنی دیگر.
3. Migration طبق SQL پیش‌نویس CCR + Backfill با default؛ در Migration file یا کامنت آن، یادداشت «Backfill مشتق از سیاست مصوب مالک است، نه ثبت لحظه‌ی تولید» الزامی است.
4. `prisma migrate deploy` روی Postgres واقعی + `prisma generate`.
5. **دروازه:** `npm test` باید سبز شود (۱۳۰ قبلی + تست‌های مرحله‌ی الف). اگر سبز نشد، توقف — مرحله‌ی ب شروع نمی‌شود. شواهد مرحله‌ی الف باید جداگانه در گزارش ثبت شود.

## ۲. مرحله‌ی ب — Adapter واقعی AC-2 (گزینه ۱ عملیاتی)

1. `OrgMembershipAC2DecisionPort` (یا نام مشابه صریح) در `foundation/access-decision/` — پیاده‌سازی `AC2DecisionPort`:
   - قواعد سیاست v1.1: عضویت فعال/معتبر Actor در سازمان مقصد + `actor.organization_id === candidate.organization_id` + مالکیت `ORGANIZATIONAL` ثبت‌شده (قاعده‌ی ۴) → عبور؛ هر نکته‌ی مبهم/غایب/خطا → `DENY` کاندیدای مذکور (نه کرش Batch).
   - **هیچ منطق audience** (Step 5 جدول است) و **هیچ Consent** (R8-a).
   - JSDoc صادقانه: «سیاست V1 — نه Kernel-AC-2 کامل».
   - تغییر `OpportunityAccessCandidate` (فایل غیرمنجمد) برای حمل `ownership_type` — طبق CCR §۵.
   - resolveActorContext (FP-03) دست‌نخورده؛ اگر جدول عضویت مستقل از Token لازم شد که وجود ندارد: همان محدودیت سند طراحی (عضویت = اعتبار Token در V1) را **مستند و به R8-a ارجاع بده** — مدل داده جدید اختراع نکن (در غیر این صورت CCR).
2. سیم‌کشی: جایگزینی Fake در مسیر Feed/ById با Adapter واقعی — فقط در نقاطی که تولیدی‌اند؛ Fake تستی برای تست‌های edge-case باقی می‌ماند.
3. تست‌های جدید روی Postgres واقعی (طبق برنامه‌ی ۱۷‌سناریویی سند طراحی — زیرمجموعه‌ی قابل‌اجرا امروز):
   - عضو همان سازمان + مالکیت ORGANIZATIONAL ثبت‌شده → allow.
   - سازمان دیگر → deny (حتی با حدس id).
   - بدون عضویت/نقش نامعتبر/Token نامعتبر → deny.
   - خطای منبع → deny کاندیدا، نه کرش.
   - مالکیت ثبت‌نشده (Simulate ردیف بدون فیلد پیش از Migration) → deny (قاعده‌ی ۳).
   - تزریق Evidence غیرمجاز → همچنان مسدود (بازتایید روی Adapter واقعی).
   - ترتیب AC-2 قبل از intended_audience حفظ شود.
   - سناریوهای Consent/فردی/جمعی (۸–۱۲ برنامه‌ی ۱۷‌گانه) → ثبت زیر R8-a/R8-b، امروز قابل‌اجرا نیستند — در گزارش صریح ذکر شود.

## ۳. ممنوعیت‌های همیشگی

- غیر از تغییرات صریح مرحله‌ی الف (طبق CCR): `shared-contracts/types.ts` و `prisma/schema.prisma` ممنوع.
- `evaluateAC2FailClosed`، `OpportunityReadService`، Featureها، `jest.config.js`، `mlino2/` — دست‌نخورده.
- Import بین‌Featureای، Prisma خارج از foundation، منطق Consent، مقدار enum غیر از `ORGANIZATIONAL`.

## ۴. تعریف Done

- هر دو مرحله کامل + `npx tsc --noEmit` تمیز.
- کل `npm test`: ۱۳۰ قبلی بدون Regression + تست‌های جدید هر دو مرحله — یک اجرا، بدون Retry، Postgres واقعی.
- گزارش کامل: فایل‌های تغییر + چک‌سام‌ها + **تغییر انتظار‌داشته‌ی Drift دو فایل منجمد با ارجاع صریح به همین CCR مصوب** (این بار Drift غیرصفر مجاز و توجیه‌شده است — فقط همین فیلدها) + شواهد جداگانه‌ی مرحله‌ی الف و ب + ذکر صریح آنچه ساخته نشد (Consent، INDIVIDUAL/AGGREGATE، لایه‌ی دانش).
- HANDOFF_ID جدید، CLAUDE_LATEST_REPORT، HANDOFF_STATE، Push دو-Commit با Hash واقعی در پاسخ نهایی به کاربر.
- تناقض با سطوح ۱–۵ اقتدار → متوقف شو، CCR/ACR — حدس نزن.

## ۵. شرط توقف

بعد از گزارش + Push، کاملاً متوقف شو — بازبینی مستقل (هر دو مرحله یکجا) را ممد جداگانه انجام می‌دهد.

---
*بازبین: ممد (GLM 5.3 Flash) — R4 (BLOCKED)، R5 (OPEN)، R8-a/b (OPEN)، این فاز: CCR→Adapter.*
