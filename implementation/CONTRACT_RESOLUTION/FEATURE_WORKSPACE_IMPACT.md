# تأثیر بر Feature Workspace / بسته‌های Agent-Ready

## وضعیت فعلی

هیچ `FEATURE_WORKSPACE` مجزایی در این جلسه ساخته یا کشف نشد؛ بسته‌های Agent-Ready اصلی همان `PHASE_4B_DISTRIBUTED_IMPLEMENTATION_PLAN/03_FEATURE_PACKAGES/F-0{1..7}/` هستند (تولیدشده در فاز ۴B، پیش از هر پیاده‌سازی واقعی). طبق دستور صریح («do not start independent Feature implementation... do not rewrite Feature implementation packages during this pass unless their Shared Contract references would become stale»)، **هیچ فایلی در `PHASE_4B_DISTRIBUTED_IMPLEMENTATION_PLAN/03_FEATURE_PACKAGES/` در این تکلیف بازنویسی نشد.**

## کدام بسته‌ها اکنون کهنه‌اند (نیازمند بازتولید در آینده)

قرارداد مشترک ارجاع‌شده در این بسته‌ها v1 است؛ نسخه‌ی پیاده‌سازی‌شده اکنون v1.1 (نامزد) است. بسته‌های زیر به فیلدهایی ارجاع می‌دهند که تغییرنام یافتند یا معنایشان تغییر کرد:

| بسته | ارجاع کهنه | دلیل |
|---|---|---|
| `03_FEATURE_PACKAGES/F-04/` | `core_entity_refs` (بدون ذکر امکان خالی‌بودن برای interaction)، `actor_core_entity_id` (در هر جای مصرف‌شده) | R6 — تفکیک Actor/Subject |
| `02_FOUNDATION_PACKAGES/FP-01_Event_Admission_And_Persistence.md` | فهرست سه‌سناریویی رد (بدون `situation_key`، بدون استثنای interaction برای core_entity_refs) | R5 + R6 |
| `03_FEATURE_PACKAGES/F-01/`, `F-02/`, `F-03/` | بدون ذکر `situation_key` در `EventCandidateDTO` تولیدی | R5 |
| `02_FOUNDATION_PACKAGES/FP-03_...` (اگر موجود) | `actor_core_entity_id` در `ActorContext` | R6 |

## چرا اکنون بازتولید نشدند

این پاس صریحاً محدود به سطح Shared Contract + پیاده‌سازی + Feature Contract سطح implementation (فایل‌های `*_REVIEW_MAP.md` داخل `implementation/`) بود؛ بسته‌های Agent-Ready رسمی Phase 4B سطح بالاتری از تشریفات (Worker Prompt Template کامل، Acceptance Tests جداگانه، Manifest) دارند که بازتولیدشان یک تکلیف مجزا و بزرگ‌تر است.

## توصیه برای بازبینی مرکزی

پس از تصویب رسمی v1.1 (طبق [[SHARED_CONTRACT_vNEXT_CHANGELOG.md]])، بسته‌های زیر باید با نسخه‌ی جدید قرارداد بازتولید/به‌روزرسانی شوند، به این ترتیب اولویت:
1. `FP-01_Event_Admission_And_Persistence.md` (بیشترین تغییر رفتاری)
2. `F-04/` (تغییر مستقیم API داخلی `recordInteraction`)
3. `F-01/`, `F-02/`, `F-03/` (افزودن `situation_key` به شرح خروجی)

تا آن زمان، سند معتبر و به‌روز برای هر مؤلفه، فایل‌های `implementation/*_REVIEW_MAP.md` (به‌روزشده در این پاس) و اسناد `CONTRACT_RESOLUTION/` هستند — نه بسته‌های اصلی Phase 4B.
