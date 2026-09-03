# تغییرنامه‌ی قرارداد مشترک — v1 → v1.1 (نامزد انجماد)

**منبع پیاده‌سازی‌شده:** `implementation/shared-contracts/types.ts`. **این نسخه هنوز رسماً منجمد نیست — نامزد است؛ بازبینی مرکزی باید آن را تصویب کند (بند ۵۶ دستور).**

## دیاگرام معنایی تغییرات

| # | OLD (v1) | NEW (v1.1) | چرا | مرجع | اثر پیاده‌سازی |
|---|---|---|---|---|---|
| 1 | `type ActorCoreEntityId = string` (برای هم actor هم subject) | `type CoreEntityId = string` (فقط subject) + `type ActorId = string` (فقط actor، جدید) | R6 — ACTOR IDENTITY ≠ SUBJECT COREENTITY IDENTITY | [[R6_ACTOR_SUBJECT_CONTRACT_CHANGE.md]] | `EventCandidateDTO.core_entity_refs`، `ActorContext`، `InteractionRecordPayload` |
| 2 | `EventCandidateDTO.core_entity_refs: ActorCoreEntityId[]` | `core_entity_refs: CoreEntityId[]` (فقط subject؛ می‌تواند خالی باشد برای `opportunity.interaction`) | R6 | همان | `admission-validator.ts`، `event-admission.service.ts` |
| 3 | `InteractionRecordPayload.actor_core_entity_id` | `InteractionRecordPayload.actor_id: ActorId` | R6 (تغییرنام) | همان | `opportunity-feed.service.ts`، `candidate-structural-validator.ts` |
| 4 | `ActorContext.actor_core_entity_id` | `ActorContext.actor_id: ActorId` | R6 (تغییرنام) | همان | `auth-adapter.ts` |
| 5 | — (وجود نداشت) | `EventCandidateDTO.situation_key?: SituationKey` (اختیاری) | R5 — هویت پایدار وضعیت کسب‌وکار | [[R5_STABLE_SITUATION_IDENTITY_SPEC.md]] | `situation-key.ts` (جدید)، سه Value Engine، `event-log.service.ts`، Schema |
| 6 | `RejectionReasonCode` (۶ مقدار) | بدون تغییر (۶ مقدار — دو مقدار پیشنهادی R4 **اضافه نشد**، چون R4 اعمال نشد) | — | [[../remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_EVIDENCE_INTEGRITY.md]] | بدون تغییر کد |

## طبقه‌بندی هر تغییر

- تغییرات ۱–۴: **R6**
- تغییر ۵: **R5**
- بدون تغییر مرتبط با R4 (اعمال نشد — BLOCKED)
- **بدون تغییر نامرتبط.** هر تغییر این نسخه مستقیماً به R4/R5/R6 برمی‌گردد.

## دیف کامل انسان‌خوان (OLD → NEW → چرا → مرجع → اثر پیاده‌سازی)

### تغییر ۱ و ۲ — تفکیک نوع Actor/Subject

```diff
- export type ActorCoreEntityId = string;
+ export type CoreEntityId = string;   // subject / organizational-reality identity
+ export type ActorId = string;        // authorization/actor identity — NOT required to be a CoreEntity

  export interface EventCandidateDTO {
    ...
-   core_entity_refs: ActorCoreEntityId[];
+   core_entity_refs: CoreEntityId[];   // SUBJECT only; may be empty for opportunity.interaction
    ...
+   situation_key?: SituationKey;       // new, optional (R5)
  }
```
**چرا:** IC-13 §5 منجمد از ابتدا `actor_ref?` را جدا از `core_entity_refs[]` تعریف کرده بود؛ Wave 1 این تفکیک را نادیده گرفت و actor را داخل `core_entity_refs` گذاشت، که باعث شد FP-01 اشتباهاً actor را ملزم به CoreEntity بودن کند.
**مرجع:** `Interaction_Contracts_v1.1_FROZEN.md:259`؛ Kernel AC-1 (`Kernel_Architecture_v1.3_FROZEN.md:54`).
**اثر:** `admission-validator.ts` (بررسی (c) اکنون برای `opportunity.interaction` آرایه‌ی خالی را می‌پذیرد)؛ `event-admission.service.ts` (پرکردن خودکار از founding event).

### تغییر ۳ و ۴ — تغییرنام فیلد actor

```diff
  export interface InteractionRecordPayload {
    interaction_type: 'SEEN' | 'ACKNOWLEDGED' | 'DISMISSED';
-   actor_core_entity_id: ActorCoreEntityId;
+   actor_id: ActorId;
  }

  export interface ActorContext {
    organization_id: OrganizationId;
-   actor_core_entity_id: ActorCoreEntityId;
+   actor_id: ActorId;
    role: 'owner_manager' | 'receptionist_coordinator';
  }
```
**چرا:** پیامد مستقیم تصمیم R6 — نام فیلد باید معنای جدید را منعکس کند؛ ادامه‌ی استفاده از نام قدیمی با نوع جدید گمراه‌کننده بود.
**مرجع:** همان.
**اثر:** `auth-adapter.ts` (claim JWT)، `opportunity-feed.service.ts`، همه‌ی فایل‌های تست مصرف‌کننده.

### تغییر ۵ — فیلد جدید `situation_key`

```diff
  export interface EventCandidateDTO {
    ...
    confidence_level: number;
    kernel_version: 'v1.3';
+   situation_key?: SituationKey;
  }
+ export type SituationKey = string;
```
**چرا:** بدون یک هویت پایدار مستقل از هش محتوا (`unique_key`)، یک وضعیت کسب‌وکار یکسان با تحلیل کمی متفاوت به‌عنوان یک Occurrence بنیان‌گذار جدید و مستقل ثبت می‌شد.
**مرجع:** ADR-00AC خط ۳۷؛ Feature Contract F-01/F-02/F-03 بند ۲۱ (فرمول Idempotency).
**اثر:** فایل جدید `foundation/event-admission/situation-key.ts`؛ سه Value Engine (`capacity`/`cancellation`/`followup-detector.service.ts`)؛ `event-log.service.ts` (ماندگاری)؛ `prisma/schema.prisma` (ستون + ایندکس).

## نامزد انجماد

پوشه‌ی کامل در [[SHARED_CONTRACT_vNEXT_FREEZE_CANDIDATE/]] — شامل نسخه‌ی کامل `types.ts` به‌عنوان مرجع نامزد.

## نکته‌ی مهم درباره‌ی سازگاری پس‌رو

این یک Breaking Change کنترل‌شده در سطح نام فیلد است (`actor_core_entity_id` → `actor_id`)، پذیرفته‌شده چون Wave 1 هنوز به هیچ مصرف‌کننده‌ی بیرونی/تولیدی متصل نیست. اگر این قرارداد در آینده توسط سیستمی خارج از این کدبیس مصرف شود، تغییرات مشابه باید یک دوره‌ی Deprecation رسمی داشته باشند.
