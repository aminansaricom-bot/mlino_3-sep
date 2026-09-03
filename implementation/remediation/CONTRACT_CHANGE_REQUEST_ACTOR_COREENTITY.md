# CONTRACT_CHANGE_REQUEST — معنای‌شناسی Actor/CoreEntity (R6)

**وضعیت: نامشخص/در انتظار تصمیم — این سند یک درخواست قطعی برای یک تغییر واحد نیست، بلکه دو مسیر جایگزین را برای تصمیم‌گیرنده مستند می‌کند، طبق نتیجه‌ی UNRESOLVED در [[ACTOR_COREENTITY_CONTRACT_REVIEW.md]]. هیچ تغییری اعمال نشده.**

## قرارداد فعلی

`PHASE_4B_DISTRIBUTED_IMPLEMENTATION_PLAN/01_SHARED_CONTRACTS/MLINO_SHARED_IMPLEMENTATION_CONTRACTS_v1/CONTRACTS.md`:
- خط ۱۳: `type ActorCoreEntityId = string;   // UUID — به‌جای core_entities با entity_type='Individual'`
- خط ۲۷: `core_entity_refs: ActorCoreEntityId[];   // از قبل، در لحظه‌ی خواندن Projection، حل‌شده`
- خط ۵۷: `actor_core_entity_id: ActorCoreEntityId;` (داخل `InteractionRecordPayload`، مجزا از `core_entity_refs`)

## مسئله

قرارداد فعلی صریحاً نمی‌گوید آیا `actor_core_entity_id` باید *همچنین* در `core_entity_refs` سطح‌بالا تکرار شود یا نه. Wave 1 (`opportunity-feed.service.ts:47`) این تکرار را انتخاب کرد، که به‌نوبه‌ی خود باعث شد اعتبارسنجی عمومی FP-01 (`admission-validator.ts`) وجود actor را به‌عنوان یک ردیف `core_entities` الزامی کند — بدون این‌که هیچ‌جا صریحاً این الزام نوشته شده باشد.

## شواهد

تحلیل کامل با ارجاعات دقیق در [[ACTOR_COREENTITY_CONTRACT_REVIEW.md]] و [[../ACTOR_COREENTITY_FINDING.md]]. خلاصه: IC-13 §5 منجمد اصلی، actor را از core_entity_refs متمایز نگه داشته بود (`actor_ref?` به‌عنوان فیلد جداگانه‌ی payload)؛ Phase 4B این تمایز را در ساختار نوع حفظ کرد اما هرگز صریحاً گفت آیا باید در `core_entity_refs` هم تکرار شود.

## Feature های متأثر

F-04 (منشأ مستقیم تصمیم تکرار) و FP-01 (محل اعمال اعتبارسنجی عمومی).

## دو مسیر پیشنهادی (بدون انتخاب)

### مسیر ۱ — رسمی‌سازی مدل A (رفتار فعلی)

قرارداد را طوری روشن کن که صریحاً بگوید: «برای `domain_tag: opportunity.interaction`، `core_entity_refs` باید شامل `actor_core_entity_id` نیز باشد؛ actor باید پیش از این ثبت به‌عنوان یک ردیف `core_entities` (entity_type=Individual) موجود باشد.» این نیازمند تعریف یک فرآیند تضمین‌کننده (Onboarding یا Just-in-time upsert) در جای دیگری از معماری است — خارج از دامنه‌ی این CCR.

**اثر سازگاری:** هیچ تغییر کد لازم نیست (رفتار فعلی حفظ می‌شود) — فقط رسمی‌سازی مستندات.
**اثر Migration:** هیچ.
**اثر تست:** هیچ تغییر لازم — تست‌های فعلی (F-04) از قبل این رفتار را پوشش می‌دهند.
**اثر امنیتی:** خنثی — رفتار فعلی حفظ می‌شود.

### مسیر ۲ — رسمی‌سازی مدل B (تفکیک Actor/Subject)

قرارداد را طوری روشن کن که صریحاً بگوید: «`core_entity_refs` فقط برای موجودیت‌های موضوعی (subject) است؛ برای payload های `opportunity.interaction`، `core_entity_refs` می‌تواند خالی باشد و `payload.actor_core_entity_id` به‌تنهایی کافی است.» این نیازمند تغییر در `admission-validator.ts` (رد شرط non-empty برای این دامنه‌ی خاص، یا تفسیر AC-1 به‌گونه‌ای که ارجاع غیرمستقیم از طریق `opportunity_correlation_id` به Opportunity هدف کافی باشد).

**اثر سازگاری:** تغییر رفتار — کاندیدهای فعلی که actor را تکرار می‌کنند هم‌چنان کار می‌کنند (فقط الزام غیرضروری می‌شود)؛ کاندیدهایی که actor بدون CoreEntity ثبت‌شده تلاش می‌کردند اکنون پذیرفته می‌شوند (تغییر رفتار قابل‌مشاهده).
**اثر Migration:** هیچ تغییر Schema لازم نیست.
**اثر تست:** نیازمند به‌روزرسانی حداقل یک تست موجود (`opportunity-feed.spec.ts` idempotency test که فعلا صریحاً یک CoreEntity برای actor می‌سازد) — این خودش شاهدی است که تغییر رفتار واقعی و قابل‌مشاهده است.
**اثر امنیتی:** باید بررسی شود که آیا حذف این الزام مسیر دیگری برای دور زدن AC-1 باز می‌کند یا نه — این تحلیل در این CCR انجام نشده و باید بخشی از بازبینی تصویب باشد.

## توقف پیاده‌سازی

طبق دستور صریح این اصلاح، **هیچ‌کدام از این دو مسیر در این تکلیف اعمال نشد.** رفتار فعلی Wave 1 (مسیر ۱، به‌صورت واقعیت، نه تصمیم) بدون تغییر باقی مانده تا تصمیم محصول/معماری گرفته شود.
