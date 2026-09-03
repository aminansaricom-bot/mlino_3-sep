# تغییر قرارداد: تفکیک هویت Actor از CoreEntity موضوعی (R6)

**حکم بازبینی مرکزی: ACTOR IDENTITY ≠ SUBJECT COREENTITY IDENTITY — تصویب‌شده به‌عنوان یک تصحیح کنترل‌شده‌ی Shared Implementation Contract، بدون تغییر در Kernel/ADR/IC منجمد.**

## قرارداد قدیمی (v1)

```typescript
export type ActorCoreEntityId = string;   // UUID — به‌جای core_entities با entity_type='Individual'

export interface EventCandidateDTO {
  ...
  core_entity_refs: ActorCoreEntityId[];  // نوع یکسان برای actor و subject
  ...
}

export interface InteractionRecordPayload {
  interaction_type: 'SEEN' | 'ACKNOWLEDGED' | 'DISMISSED';
  actor_core_entity_id: ActorCoreEntityId;
}

export interface ActorContext {
  organization_id: OrganizationId;
  actor_core_entity_id: ActorCoreEntityId;
  role: 'owner_manager' | 'receptionist_coordinator';
}
```

## مسئله

نام و نوع یکسان (`ActorCoreEntityId`) برای دو مفهوم متفاوت استفاده می‌شد: هویت **actor** (چه کسی این تعامل را انجام داد — یک مفهوم مجوز/Authorization) و ارجاعات **subject CoreEntity** (این Opportunity درباره‌ی چه واقعیتی از سازمان است — بیمار، منبع، نوبت). این خلط باعث شد Wave 1 عملاً actor را داخل `core_entity_refs` عمومی قرار دهد (`opportunity-feed.service.ts:47`)، و اعتبارسنجی عمومی FP-01 بدون قصد صریح، actor را ملزم به داشتن یک ردیف `core_entities` واقعی کند.

## قرارداد جدید (vNEXT / v1.1)

```typescript
export type CoreEntityId = string;  // UUID — یک ردیف واقعی core_entities (هویت واقعیت سازمانی/موضوعی). نام جدید در v1.1؛ جایگزین ActorCoreEntityId برای این نقش.
export type ActorId = string;       // UUID — هویت مجوز/actor (خروجی FP-03). نیازی به تطابق با core_entities ندارد؛ ممکن است داشته باشد یا نه — این قرارداد رابطه‌ای تحمیل نمی‌کند.

export interface EventCandidateDTO {
  ...
  core_entity_refs: CoreEntityId[];  // فقط ارجاعات SUBJECT — بدون تغییر معنایی برای Value Engineها؛ برای opportunity.interaction اکنون می‌تواند خالی باشد (بند پایین)
  ...
}

export interface InteractionRecordPayload {
  interaction_type: 'SEEN' | 'ACKNOWLEDGED' | 'DISMISSED';
  actor_id: ActorId;  // تغییرنام از actor_core_entity_id
}

export interface ActorContext {
  organization_id: OrganizationId;
  actor_id: ActorId;  // تغییرنام از actor_core_entity_id
  role: 'owner_manager' | 'receptionist_coordinator';
}
```

## قاعده‌ی جدید در مرز پذیرش (FP-01)

برای `domain_tag: 'opportunity.interaction'`:
- `core_entity_refs` اکنون **می‌تواند خالی باشد** (پیش‌تر، هر کاندید با آرایه‌ی خالی رد می‌شد — دقیقاً همان بررسی که actor را مجبور می‌کرد CoreEntity باشد).
- اگر خالی باشد، مرز پذیرش (نه F-04) به‌طور خودکار `core_entity_refs` را از ارجاعات CoreEntity رویداد Occurrence بنیان‌گذار **هدف** پر می‌کند — یعنی زمینه‌ی کسب‌وکار Opportunity (مثلاً بیمار X) حفظ می‌شود، بدون این‌که actor نیازی به بودن به‌عنوان CoreEntity داشته باشد. این AC-1 (هر Business Event باید به حداقل یک Core Entity نگاشت شود) را با ارجاع به موضوع واقعی، نه actor، برآورده می‌کند.
- اگر کاندید صراحتاً `core_entity_refs` غیرخالی ارائه دهد، هم‌چنان طبق روال قبلی برای وجود واقعی بررسی می‌شود (دفاع در عمق — این تغییر رفتار قدیمی را برای Value Engineهای تشخیص تغییر نمی‌دهد).

## مرجع معماری

- IC-13 §5 منجمد (`Interaction_Contracts_v1.1_FROZEN.md:259`) از ابتدا `actor_ref?` را به‌عنوان فیلدی **مجزا** از `core_entity_refs[]` در Schema تعریف کرده بود — این تصحیح، پیاده‌سازی را با همان طراحی اصلی هم‌راستا می‌کند، نه این‌که آن را تغییر دهد.
- Kernel AC-1 (`Kernel_Architecture_v1.3_FROZEN.md:54`) — «هر Business Event باید به حداقل یک موجودیت Core نگاشت شود» — **حفظ شده**، اکنون از طریق ارجاع صحیح به موضوع Opportunity، نه actor.
- **بدون تغییر** در Kernel، ADR-00AC/AD/AE، یا متن IC-13/IC-14 منجمد.

## DTOهای متأثر

`EventCandidateDTO` (نوع `core_entity_refs`)، `InteractionRecordPayload` (تغییرنام فیلد)، `ActorContext` (تغییرنام فیلد).

## Feature های متأثر

- **F-03 (FP-03، سازگارساز مجوز):** `auth-adapter.ts` — `ActorContext` تولیدشده اکنون `actor_id` دارد، نه `actor_core_entity_id`.
- **F-04 (Feed):** `opportunity-feed.service.ts` — `recordInteraction` اکنون `core_entity_refs: []` ارسال می‌کند و `payload.actor_id` (نه `actor_core_entity_id`) را پر می‌کند؛ دیگر actor را در `core_entity_refs` تکرار نمی‌کند.
- **FP-01:** `admission-validator.ts` (بررسی (c) اصلاح‌شده) و `event-admission.service.ts` (منطق پرکردن خودکار subject از founding event، جدید).

## تست‌های متأثر

`test/foundation/auth-adapter.spec.ts` (فیلد `actor_id`)، `test/feed/opportunity-feed.spec.ts` (دیگر نیازی به ساختن CoreEntity برای actor نیست — این خودش تغییر رفتار قابل‌مشاهده است، مستند در changelog)، `test/foundation/event-admission-validation.spec.ts` (فیلد `payload.actor_id`)، `test/mocks/mock-ic14-read-interface.ts` (فیلد `actor_id` در امضای متدها).

## اثر DB

**صفر.** رابطه‌ی `EventCoreEntities` (many-to-many بین `EventLog` و `CoreEntity`) بدون تغییر باقی می‌ماند — فقط اکنون همیشه به موضوع واقعی اشاره می‌کند، نه گاهی به actor. بدون تغییر Schema، بدون Migration.

## اثر Migration

**صفر.**

## اثر مجوز (Authorization)

**تقویت‌کننده.** پیش‌تر، یک actor بدون CoreEntity ثبت‌شده نمی‌توانست هیچ تعاملی ثبت کند (شکست خاموش با پیام گمراه‌کننده `CORE_ENTITY_REF_UNRESOLVED`، به‌ظاهر یک خطای «موضوع»، در حالی‌که واقعاً یک محدودیت actor بود). اکنون تصمیم مجوز actor کاملاً به FP-03/AC-2 واگذار شده — دقیقاً جایی که باید باشد.

## سازگاری پس‌رو (Backward Compatibility)

**Breaking change کنترل‌شده در سطح Shared Contract.** این تغییرنام فیلد (`actor_core_entity_id` → `actor_id`) در همه‌ی مصرف‌کنندگان به‌طور هم‌زمان در همین پاس اعمال می‌شود (بدون دوره‌ی گذار Deprecated، چون هنوز هیچ مصرف‌کننده‌ی بیرونی/تولیدی به این قرارداد متصل نیست — Wave 1 هنوز به Malino واقعی وصل نشده). برای نسخه‌ی بعدی که واقعاً در تولید مصرف می‌شود، تغییرات مشابه باید یک دوره‌ی Deprecation رسمی داشته باشند — این نکته در Changelog مستند شده.
