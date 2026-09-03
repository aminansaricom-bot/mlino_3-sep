# نقشه‌ی بازبینی پایگاه‌داده

منبع طراحی: `PHASE_4A_IMPLEMENTATION_DESIGN/02_DATABASE/V1_DATABASE_DESIGN.md`. فایل واقعی: `prisma/schema.prisma`.

> **یادداشت پاس Contract Resolution:** یک Migration جدید (`20260815033018_add_situation_key`) ستون Nullable `situation_key` + یک ایندکس ترکیبی `(organization_id, domain_tag, situation_key)` به `event_log` افزوده — برای R5. بدون Constraint یکتا (عمداً، تا منطق FP-02 وجود داشته باشد). جزئیات کامل: [[CONTRACT_RESOLUTION/DB_IMPACT_REVIEW.md]].

## جداول ساخته‌شده و فعال در Wave 1

### `core_entities` (مدل `CoreEntity`)
- ستون‌ها: `id` (UUID، PK)، `organization_id`، `entity_type` (enum `Individual`/`Interaction`)، `domain_tag`، `created_at`
- ایندکس: `[organizationId, entityType]`
- رابطه: many-to-many با `EventLog` از طریق رابطه‌ی نام‌گذاری‌شده‌ی `EventCoreEntities`

### `event_log` (مدل `EventLog`)
- ستون‌ها: `id` (PK)، `unique_key` (**یکتا**)، `event_type` (enum OCCURRENCE/AMENDMENT/RETRACTION)، `event_time`، `ingestion_time`، `source_ref`، `producer_type` (enum external/internal)، `producer_id` (nullable)، `kernel_version`، `confidence_level`، `domain_tag`، `causal_links` (Json، nullable)، `amends_event_id` (nullable)، `organization_id`، `payload` (Json)
- ایندکس‌ها: `[organizationId, domainTag, eventTime]`، `[amendsEventId]`
- این جدول همان Event Log Kernel §۸ (Capability 1) است — تنها نویسنده `event-log.service.ts:40`

### `admission_observability` (مدل `AdmissionObservability`)
- ستون‌ها: `id`، `organization_id` (nullable)، `producer_id` (nullable)، `domain_tag` (nullable)، `raw_payload` (Json)، `rejection_reason`، `rejected_at`
- هدف: ثبت هر رد کاندید رویداد برای مشاهده‌پذیری — بدون ایندکس اضافه در Wave 1 (حجم کم مورد انتظار)

### `domain_signal_producer_registry` (مدل `DomainSignalProducerRegistry`)
- ستون‌ها: `producer_id` (PK)، `producer_kind` (enum value_engine/interaction_layer)، `allowed_domain_tags` (String[])، `active`، `registered_at`
- رجیستری بسته‌ی تولیدکنندگان مجاز (کنترل «بدون Backdoor پلاگین عمومی»)

## جداول طرح‌شده اما بدون منطق سرویس (موکول به FP-02)

### `opportunity_current_state` (مدل `OpportunityCurrentState`)
- PK: `opportunity_correlation_id`؛ شامل `state` (ACTIVE/EXPIRED)، `materiality_score`/`materiality_basis`، `intended_audience`، `evidence_refs` (Json)، `expires_at`، `latest_event_id`، `last_computed_at`
- ایندکس‌ها: `[organizationId, domainTag, state]`، `[organizationId, state, expiresAt]`
- **هیچ سرویسی در Wave 1 این جدول را نمی‌خواند یا نمی‌نویسد** — نگاشت این وضعیت به‌عهده‌ی FP-02 (بعد از بازبینی مرکزی) است. F-04/F-05 در Wave 1 از `MockIC14ReadInterface` (In-Memory، بدون Postgres) استفاده می‌کنند.

### `opportunity_interaction_state` (مدل `OpportunityInteractionState`)
- PK ترکیبی: `[opportunityCorrelationId, actorCoreEntityId]`؛ شامل `interaction_type` (enum SEEN/ACKNOWLEDGED/DISMISSED)، `latest_event_id`، `updated_at`
- طراحی‌شده تا وضعیت actor **در سطح جفت (Opportunity, Actor)** ذخیره شود، نه سراسری روی Opportunity — این طرح مستقیماً اصلاح فاز ۳C را منعکس می‌کند. بدون سرویس فعال در Wave 1.

### `revenue_recovery_raw_aggregate` (مدل `RevenueRecoveryRawAggregate`)
- PK ترکیبی: `[organizationId, domainTag, periodStart, periodEnd]`؛ شامل `open_count`، `computed_at`
- بدون مصرف‌کننده در Wave 1 — طرح آماده برای گزارش‌گیری تجمیعی آینده.

## مرزهای Tenant/سازمان

هر جدول فعال (`core_entities`, `event_log`, `admission_observability`, `opportunity_current_state`, `opportunity_interaction_state`, `revenue_recovery_raw_aggregate`) دارای `organization_id` است؛ هیچ جدولی بدون این ستون یافت نشد.

## نمایش Event Log

هر رویداد OCCURRENCE/AMENDMENT/RETRACTION یک ردیف `event_log` است. زنجیره‌ی AMENDMENT/RETRACTION از طریق `amends_event_id` (اشاره به `id` رویداد بنیان‌گذار یا رویداد قبلی) دنبال می‌شود — بدون جدول جداگانه‌ی «تاریخچه».

## نمایش Idempotency

`unique_key` (ستون یکتا روی `event_log`) — تنها مکانیزم Idempotency در Wave 1؛ بدون جدول جداگانه‌ی Deduplication.

## توالی Migration

یک Migration واحد: `20260814065924_init` (شامل همه‌ی جداول بالا؛ بدون Migration بعدی). `prisma/migrations/migration_lock.toml` provider را `postgresql` قفل کرده است.

## نکته‌ی مرتبط با یافته‌ی Actor/CoreEntity

بررسی FP-01 (`core_entity_refs` باید در `core_entities` حل شود) یک بررسی **در سطح اپلیکیشن** است، نه یک Foreign Key واقعی روی actor در سطح Schema برای Payload تعامل به‌طور مجزا — رابطه‌ی many-to-many `EventCoreEntities` عمومی است و بین «actor» و «subject» در سطح Schema تمایزی قائل نمی‌شود. جزئیات کامل در [[ACTOR_COREENTITY_FINDING.md]].
