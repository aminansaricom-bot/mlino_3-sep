# یافته: نیازمندی Actor → CoreEntity

**وضعیت این سند: فقط شواهد. هیچ تصمیمی گرفته نشد. این یافته به‌طور خودکار به Architecture Fact تبدیل نشده و نباید بشود.**

---

## A. مکان دقیق کد که actor→CoreEntity را الزامی می‌کند

**`implementation/feed/opportunity-feed.service.ts:47`** (تابع `recordInteraction`، متد F-04):

```typescript
core_entity_refs: [actor.actor_core_entity_id],
```

این خط، شناسه‌ی actor را مستقیماً وارد آرایه‌ی عمومی `core_entity_refs` می‌کند — همان آرایه‌ای که برای موجودیت‌های موضوعی (مثلاً بیمار) در Value Engineها استفاده می‌شود.

**CONFIRMED.**

## B. مکان دقیق Schema/اعتبارسنجی درگیر

**`implementation/foundation/event-admission/admission-validator.ts:38-49`:**

```typescript
// (c) core_entity_refs must still resolve against current Projection (core_entities table)
if (candidate.core_entity_refs.length === 0) {
  return { valid: false, reason: 'CORE_ENTITY_REF_UNRESOLVED' };
}
const resolvedCount = await prisma.coreEntity.count({
  where: { id: { in: candidate.core_entity_refs }, organizationId: candidate.organization_id },
});
if (resolvedCount !== candidate.core_entity_refs.length) {
  return { valid: false, reason: 'CORE_ENTITY_REF_UNRESOLVED' };
}
```

این یک بررسی **عمومی** است — هیچ منطق اختصاصی «actor» یا «interaction» در آن وجود ندارد؛ هر مقداری در `core_entity_refs` باشد، باید در جدول `core_entities` موجود باشد. **CONFIRMED.**

## C. تست دقیقی که این نیازمندی را آشکار کرد

**`implementation/test/feed/opportunity-feed.spec.ts`**، تست «idempotency: recording the same interaction twice…» — نسخه‌ی اول این تست بدون ثبت `CoreEntity` برای actor نوشته شده بود و با `rejection_reason: CORE_ENTITY_REF_UNRESOLVED` شکست خورد؛ رفع آن (افزودن `prisma.coreEntity.create` برای `managerA.actor_core_entity_id`) این نیازمندی را آشکار کرد. **CONFIRMED** (مشاهده‌ی مستقیم در طول اجرای Wave 1، مستند در `WAVE_1_STATUS.md` پیشین).

## D. قرارداد(های) مشترک درگیر

`implementation/shared-contracts/types.ts`:
- `EventCandidateDTO.core_entity_refs: ActorCoreEntityId[]` (خط ۵۲)
- `InteractionRecordPayload.actor_core_entity_id: ActorCoreEntityId` (خط ۴۳ — فیلد **مجزا و اضافی** روی همان actor، درون Payload)

**یافته‌ی دقیق:** actor در دو جای مختلف حمل می‌شود — هم در `core_entity_refs` (سطح بالای Candidate، عمومی) و هم در `payload.actor_core_entity_id` (اختصاصی نوع تعامل). قرارداد مشترک (`PHASE_4B.../CONTRACTS.md`) هرگز صریحاً نگفته که مقدار دوم باید در مقدار اول *نیز* تکرار شود — این تصمیم در زمان نگارش `opportunity-feed.service.ts` (بند A) گرفته شده، نه در متن خودِ قرارداد منجمد. **CONFIRMED برای وجود دو‌گانگی؛ INFERRED برای این‌که خودِ قرارداد آن را الزام نکرده (سکوت قرارداد، نه ممنوعیت یا الزام صریح).**

## E. ارجاعات معماری منجمد مرتبط

- Kernel §۴: «ارجاع به موجودیت(های) Core (پس از عبور از Domain Adaptation)» — عمومی، بدون تفکیک actor/subject. **CONFIRMED به‌عنوان متن، INFERRED برای اعمال به این مورد خاص.**
- Kernel §۹ (مدل هویت): موجودیت‌های Core شامل `Individual` است (طبق ADR تأیید‌شده‌ی Core Entity Types) — یک actor انسانی (کارمند/مدیر کلینیک) از نظر مفهومی می‌تواند یک `Individual` باشد. **INFERRED** — هیچ سند منجمد صریحاً نگفته «هر actor باید CoreEntity باشد»؛ این یک استنتاج معقول از تعریف عمومی `Individual`، نه یک قاعده‌ی صریح.
- ADR-00AE (تحویل نقش‌آگاه) و `OPPORTUNITY_LIFECYCLE_AND_CONTRACTS_v2.md`: رکورد تعامل را `{opportunity_correlation_id, actor_core_entity_id, interaction_type, timestamp}` توصیف کرده‌اند — **بدون** گفتن این‌که `actor_core_entity_id` باید *همچنین* در `core_entity_refs` عمومی تکرار شود. **CONFIRMED برای متن سند؛ نشان می‌دهد این جزئیات پیاده‌سازی، فراتر از آن‌چه سند گفته است.**

## F. ارجاعات فاز ۴A/۴B مرتبط

`PHASE_4B_DISTRIBUTED_IMPLEMENTATION_PLAN/01_SHARED_CONTRACTS/.../CONTRACTS.md` بخش `EventCandidateDTO`: می‌گوید `core_entity_refs: از قبل، در لحظه‌ی خواندن Projection، حل‌شده» — این توصیف برای **Value Engine ها** (که موجودیت موضوعی مثل بیمار را از Projection می‌خوانند) نوشته شده؛ هیچ‌جا صراحتاً برای **لایه‌ی تعامل** (interaction-layer producer) تکرار نشده. **CONFIRMED برای متن؛ INFERRED که تعمیم آن به لایه‌ی تعامل یک انتخاب پیاده‌سازی بوده، نه دستور صریح سند.**

## G. اگر actor یک CoreEntity نداشته باشد چه اتفاقی می‌افتد

`submitEventCandidate` با `admission_result: 'rejected'` و `rejection_reason: 'CORE_ENTITY_REF_UNRESOLVED'` رد می‌کند (طبق بند B) — یعنی API-03 (ثبت SEEN/ACKNOWLEDGED/DISMISSED) برای هر actor بدون CoreEntity ثبت‌شده، **همیشه شکست می‌خورد.** **CONFIRMED**، مستقیماً مشاهده‌شده در تست (بند C).

## H. طبقه‌بندی خاستگاه این نیازمندی

| منبع احتمالی | طبقه‌بندی |
|---|---|
| معماری منجمد (Kernel/ADR/IC به‌طور صریح) | **خیر — UNKNOWN/رد.** هیچ سند منجمدی صریحاً «actor باید CoreEntity باشد» را الزام نکرده |
| قرارداد پیاده‌سازی مشترک (Phase 4B) | **جزئاً — INFERRED.** قرارداد `core_entity_refs` عمومی است و توضیح صریح «قبلاً حل‌شده» فقط برای Value Engine نوشته شده؛ کاربرد آن برای actor یک تعمیم پیاده‌سازی است |
| انتخاب پیاده‌سازی DB (این بسته) | **بله — CONFIRMED.** انتخاب طراحی `admission-validator.ts` برای اعتبارسنجی *عمومی و یکسان* روی هر مقدار `core_entity_refs`، بدون استثنا برای منبع «تعامل» |
| طراحی Fixture تست | **بله — CONFIRMED (نقش کاشف، نه علت).** تست بود که این پیامد را آشکار کرد، نه این‌که تست آن را ایجاد کرده باشد |
| پیاده‌سازی مجوز (FP-03) | **خیر.** `auth-adapter.ts` هیچ بررسی CoreEntity انجام نمی‌دهد؛ فقط ادعای JWT را عبور می‌دهد |
| پیاده‌سازی وضعیت actor در Opportunity | **بله، جزئاً — CONFIRMED.** انتخاب F-04 (بند A) برای قراردادن `actor_core_entity_id` در `core_entity_refs` عمومی، مستقیم‌ترین علت است |
| نامشخص/غیرقابل‌تعیین از منابع اصلی | برای بخش «آیا معماری این را الزام می‌کند» — **بله، UNKNOWN باقی می‌ماند** تا زمانی که مالک محصول/معمار صریحاً تصمیم بگیرد |

## نتیجه‌گیری صریح (فقط توصیف، نه تجویز)

این نیازمندی **ترکیبی از یک انتخاب پیاده‌سازی عمومی در FP-01 (اعتبارسنجی یکسان روی همه‌ی `core_entity_refs`) و یک انتخاب مشخص در F-04 (تکرار `actor_core_entity_id` در همان آرایه)** است — **نه** یک قاعده‌ی صریح معماری منجمد. عبارت «هر کاربر Malino باید هنگام Onboarding یک CoreEntity معادل داشته باشد» که در `WAVE_1_STATUS.md` قبلی به‌عنوان پیامد ذکر شد، **یک نتیجه‌ی محتمل عملیاتی است، نه یک تصمیم تصویب‌شده** — طبق دستور صریح این بازبینی، این تصمیم اکنون گرفته نشد و باید جداگانه بررسی شود.
