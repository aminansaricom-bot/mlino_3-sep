# بررسی تأثیر پایگاه‌داده (R4/R5/R6)

## خلاصه

| یافته | تغییر Schema | Migration | ایندکس | Constraint یکتایی | Backfill | سازگاری داده‌ی موجود Wave 1 |
|---|---|---|---|---|---|---|
| R4 (یکپارچگی Evidence) | **خیر — BLOCKED** | خیر | — | — | — | بدون اثر |
| R5 (هویت وضعیت پایدار) | **بله — یک ستون** | **بله** | بله | **خیر (عمداً، پایین توضیح داده شده)** | خیر | کاملاً سازگار (ستون Nullable) |
| R6 (تفکیک Actor/Subject) | **خیر** | خیر | — | — | — | بدون اثر (فقط رابطه‌ی موجود `EventCoreEntities` متفاوت استفاده می‌شود، بدون تغییر ساختار) |

## R4 — بدون تغییر

طبق طبقه‌بندی BLOCKED (نگاه کنید [[../remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_EVIDENCE_INTEGRITY.md]])، هیچ منطق اعتبارسنجی جدیدی پیاده‌سازی نشد؛ بنابراین هیچ نیاز Schema‌ای هم مطرح نشد.

## R5 — ستون `situation_key`

### تغییر دقیق

`prisma/schema.prisma`، مدل `EventLog`:
```prisma
situationKey String? @map("situation_key")
```
+ ایندکس ترکیبی: `@@index([organizationId, domainTag, situationKey])`

### Migration اعمال‌شده

`prisma/migrations/20260815033018_add_situation_key/migration.sql`:
```sql
ALTER TABLE "event_log" ADD COLUMN "situation_key" TEXT;
CREATE INDEX "event_log_organization_id_domain_tag_situation_key_idx" ON "event_log"("organization_id", "domain_tag", "situation_key");
```

### آیا Constraint یکتایی لازم است؟ **نه، هنوز.**

یک Constraint یکتا روی `(organization_id, domain_tag, situation_key)` محدود به ردیف‌های `event_type='OCCURRENCE'` می‌توانست از تولید دو Occurrence بنیان‌گذار مستقل برای یک وضعیت جلوگیری کند. اما این کار **زودهنگام** است: طبق [[R5_STABLE_SITUATION_IDENTITY_SPEC.md]]، منطق «آیا Opportunity باز موجودی برای این وضعیت هست؟» هنوز پیاده نشده (به FP-02 موکول شده) — یعنی هیچ Value Engine در Wave 1 فعلاً حتی تلاش نمی‌کند AMENDMENT تولید کند؛ هرکدام همیشه OCCURRENCE تولید می‌کنند. افزودن Constraint یکتا الان یعنی رفتار موجود (که قبلاً هم درست تست شده — سکوت بین چرخه‌ها یا Idempotency بر پایه‌ی unique_key، نه situation_key) را می‌تواند بشکند، بدون این‌که مزیت واقعی‌ای اضافه کند، چون منطق تصمیم هنوز وجود ندارد که از این Constraint استفاده کند. این تصمیم آگاهانه به زمانی موکول شده که FP-02 واقعی وجود دارد و معنای «باز» (ACTIVE) مشخص است.

### آیا Backfill لازم است؟ **نه.**

ستون Nullable است؛ ردیف‌های موجود (اگر باشند) `situation_key = NULL` می‌گیرند — هیچ رفتار جدیدی برای آن‌ها فعال نمی‌شود (هیچ Query‌ای به NULL بودن این فیلد وابسته نیست).

### وضعیت داده‌ی تست/توسعه‌ی فعلی Wave 1

پایگاه‌داده‌ی Wave 1 فقط شامل داده‌ی تست است (Docker Postgres محلی، `mlino-v1-local-db`) — بدون داده‌ی تولید واقعی. **تصمیم: بدون نیاز به Reset یا Migration ویژه** — Migration به‌صورت عادی (`prisma migrate dev`) روی پایگاه‌داده‌ی موجود اعمال شد؛ داده‌ی تست موجود (اگر قبل از این پاس مانده بود) دست‌نخورده باقی ماند، فقط ستون جدید NULL برایشان ثبت شد.

## R6 — بدون تغییر Schema

رابطه‌ی many-to-many `EventCoreEntities` (بین `EventLog` و `CoreEntity`) بدون تغییر باقی می‌ماند. تفاوت فقط در **این‌که چه مقادیری** در این رابطه ذخیره می‌شوند (اکنون همیشه موضوع، هرگز actor) است — یک تغییر رفتار در لایه‌ی اپلیکیشن (`event-admission.service.ts`)، نه یک تغییر ساختاری در پایگاه‌داده.

## نتیجه‌ی کلی

فقط **یک** Migration در این پاس اعمال شد (`20260815033018_add_situation_key`)، Additive-only (ستون Nullable + ایندکس)، بدون Backfill، بدون Constraint یکتای جدید، بدون بازطراحی Phase 4A DB، بدون جدول FP-02.
