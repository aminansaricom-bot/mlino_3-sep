# نقشه‌ی بازبینی FP-01 (پذیرش و ماندگاری رویداد)

> **یادداشت اصلاح (Remediation، بعد از بازبینی مرکزی اول):** این سند از دوره‌ی بسته‌بندی اولیه‌ی Wave 1 است. از آن زمان، FP-01 اصلاح جراحی شده — Idempotency اکنون اتمیک است (R1)، اعتبارسنجی زمان اجرا تقویت شده (R2، فایل جدید `candidate-structural-validator.ts`)، و یکپارچگی هدف Amendment تقویت شده (R3). جزئیات کامل و به‌روز در [[remediation/WAVE_1_SURGICAL_REMEDIATION_REPORT.md]] و [[remediation/WAVE_1_REMEDIATION_CHANGELOG.md]]. متن زیر (بندهای اصلاح‌نشده) هنوز به‌طور کلی معتبر است اما بخش‌های Idempotency/اعتبارسنجی/Amendment را باید همراه با اسناد اصلاح خواند، نه به‌تنهایی.
>
> **یادداشت پاس دوم (Contract Resolution R4/R5/R6):** بند «core_entity_refs باید حل شود» (بند ۳ فهرست پایین) اکنون یک استثنای صریح برای `opportunity.interaction` دارد — آرایه می‌تواند خالی باشد؛ `event-admission.service.ts` آن را از موضوع رویداد Occurrence بنیان‌گذار پر می‌کند (نه از actor). فیلد جدید `situation_key` اکنون در FP-01 پذیرفته (اعتبارسنجی ساختاری اختیاری) و ماندگار می‌شود (ستون جدید `situation_key` در `event_log`) اما هیچ منطق جستجو/تصمیم روی آن اجرا نمی‌شود (به FP-02 موکول). R4 (یکپارچگی evidence_refs) تلاش برای پیاده‌سازی داشت اما BLOCKED شد — جزئیات در [[CONTRACT_RESOLUTION/WAVE_1_CONTRACT_RESOLUTION_REPORT.md]].

## مسیرهای فایل

- رجیستری تولیدکننده: `foundation/producer-registry/producer-registry.service.ts`
- اعتبارسنجی کاندید: `foundation/event-admission/admission-validator.ts`
- کلید یکتا (Idempotency): `foundation/event-admission/unique-key.ts`
- هماهنگ‌کننده‌ی IC-13: `foundation/event-admission/event-admission.service.ts`
- ماندگاری Event Log: `foundation/event-log/event-log.service.ts`
- Prisma Client مشترک: `foundation/prisma-client.ts`

## رجیستری تولیدکننده

`ProducerRegistration { producerId, producerKind: 'value_engine'|'interaction_layer', allowedDomainTags }`. `registerProducer` یک `upsert` روی جدول `domain_signal_producer_registry` است. `lookupProducer` رکورد را می‌خواند و `{found, active, allowedDomainTags}` برمی‌گرداند. `seedV1CoreProducerRegistry()` چهار تولیدکننده‌ی V1 Core را با `domain_tag` انحصاری هرکدام ثبت می‌کند (`value-engine:capacity`→`opportunity.capacity`، `value-engine:cancellation`→`opportunity.cancellation`، `value-engine:followup`→`opportunity.followup`، `interaction-layer:ui`→`opportunity.interaction`). این رجیستری بسته است: هیچ تولیدکننده‌ی ثبت‌نشده نمی‌تواند از `admission-validator.ts` عبور کند (تست: «rejects a candidate from an unregistered producer»).

## اعتبارسنجی کاندید رویداد (مسیر IC-13)

پنج بررسی به‌ترتیب در `admission-validator.ts`:
1. تولیدکننده ثبت‌شده و فعال باشد (`PRODUCER_NOT_REGISTERED` / `PRODUCER_INACTIVE`)
2. `domain_tag` در فهرست بسته‌ی `ALLOWED_DOMAIN_TAGS` **و** مجاز برای همین تولیدکننده باشد (`DOMAIN_TAG_NOT_ALLOWED_FOR_PRODUCER`)
3. همه‌ی `core_entity_refs` در جدول `core_entities` برای همان `organization_id` وجود داشته باشند (`CORE_ENTITY_REF_UNRESOLVED`) — نگاه کنید به [[ACTOR_COREENTITY_FINDING.md]] برای پیامد این بررسی روی actor
4. Payload یک شیء معتبر باشد (`PAYLOAD_INCOMPLETE`)
5. برای AMENDMENT/RETRACTION، `opportunity_correlation_id` باید به یک ردیف واقعی و هم‌سازمانی در `event_log` اشاره کند (`OPPORTUNITY_CORRELATION_ID_INVALID`)

## مسیر پیاده‌سازی IC-13

`EventAdmissionService.submitEventCandidate` (پیاده‌ساز واقعی `IC13SubmissionInterface`): اعتبارسنجی → اگر نامعتبر، یک ردیف `AdmissionObservability` ثبت می‌کند و `{admission_result:'rejected', rejection_reason}` برمی‌گرداند؛ اگر معتبر، `persistEvent` را صدا می‌زند و `{admission_result:'accepted', event_id, opportunity_correlation_id}` برمی‌گرداند. برای OCCURRENCE، `opportunity_correlation_id` خروجی همان `event_id` تازه‌ساخته‌شده است (طبق ADR-00AC)؛ برای AMENDMENT/RETRACTION، همان مقدار ورودی عبور داده می‌شود.

## Idempotency

`generateUniqueKey(producerId, sourceRef, contentForHash)` یک هش SHA-256 از `JSON.stringify(payload)` می‌سازد و آن را با `producerId:sourceRef:hash` ترکیب می‌کند (`unique-key.ts`). `persistEvent` قبل از `create`، با `findUnique({where:{uniqueKey}})` بررسی می‌کند؛ در صورت وجود، `{duplicate:true, eventId}` برمی‌گرداند بدون نوشتن ردیف دوم. تست مستقیم: «is idempotent — resubmitting the identical candidate does not create a duplicate Occurrence».

## ماندگاری (Event Log)

`persistEvent` در `event-log.service.ts` **تنها** محل تولیدی صداکننده‌ی `prisma.eventLog.create()` است (تأیید‌شده با grep: تنها یک مورد در کل کد منبع، خط ۴۰؛ سایر تطابق‌های `prisma.eventLog.*` همگی `deleteMany` در فایل‌های تست هستند). `coreEntities.connect` روی همه‌ی `core_entity_refs` اعمال می‌شود.

## دسترسی به Tenant/سازمان

هر بررسی (رجیستری، core_entity_refs، correlation id) صریحاً `organizationId`/`organization_id` را در شرط `where` قید می‌کند — هیچ Query سراسری (بدون فیلتر سازمان) در این مسیر یافت نشد.

## مدیریت شواهد/همبستگی

`opportunity_correlation_id` برای OCCURRENCE = شناسه‌ی همان رویداد تازه (طبق تصحیح هویت ADR-00AC)؛ `unique_key` صرفاً برای Idempotency است و هرگز به‌عنوان هویت پایدار استفاده نشده — دقیقاً طبق کامنت توضیحی در `unique-key.ts`.

## مدیریت خطا

هر مسیر رد شامل یک `RejectionReasonCode` معتبر از نوع مشترک است؛ هیچ Exception خام به بیرون درز نمی‌کند؛ رد شدن همیشه یک ردیف `AdmissionObservability` تولید می‌کند (مشاهده‌پذیری رد، نه فقط سکوت).

## تست‌ها (۸/۸ — `test/foundation/event-admission.spec.ts`)

پذیرش OCCURRENCE معتبر؛ رد تولیدکننده‌ی ثبت‌نشده؛ رد domain_tag غیرمجاز؛ رد core_entity_refs حل‌نشده؛ Idempotency؛ پذیرش AMENDMENT معتبر؛ رد AMENDMENT با correlation id نامعتبر؛ عدم نوشتن ردیف جزئی هنگام رد.

## اثبات کد-محور: IC-13/FP-01 تنها مسیر نوشتن Event Log است

```
grep -rn "prisma\.eventLog\.\(create\|update\|upsert\|delete\)" --include="*.ts" .
→ فقط: foundation/event-log/event-log.service.ts:40 (create)
       سایر تطابق‌ها در test/**/*.spec.ts هستند و از نوع deleteMany (پاک‌سازی تست)

grep -rn "new PrismaClient" --include="*.ts" .
→ فقط: foundation/prisma-client.ts:9
```

هیچ Feature یا ماژول دیگری مستقیماً Prisma را وارد نمی‌کند یا نمونه‌سازی می‌کند — تأیید‌شده در `WAVE_1_VALIDATION_RESULTS.md`.
