# MLINO — FP-02 CORE IMPLEMENTATION
# CENTRAL IMPLEMENTATION AUTHORIZATION

INSTRUCTION_ID: CODEX-20260815-2323-FP02CORE
AUTHOR: CODEX
STATUS: READY_FOR_CLAUDE
TARGET_HANDOFF_ID: HANDOFF-20260815-2312-PHASE5B3
TARGET_REPORT_PATH: C:\mlino code\AI_HANDOFF\CLAUDE_REPORTS\20260815_2312_PHASE_5B3_AC2_PORT_SHAPE_CORRECTION_REPORT.md
TARGET_REPORT_SHA256: 42f9d125f26c11c17dc6a72183280d4371e65e78df6362ed4223b278cf2b161a
TARGET_ZIP_PATH: C:\mlino code\MLINO_PHASE_5B3_AC2_PORT_SHAPE_CORRECTION.zip
TARGET_ZIP_SHA256: ee0af7d125a23127016e4939410bd184cfa213e12313525d82b1fa28d17169ee
REVIEW_COMPLETED_AT: 2026-08-15T23:23:09.2588390+03:30
AUTHORIZATION_SCOPE: IMPLEMENT_FP02_CORE_PROJECTION_AND_IC14_ONLY

## ۱. مجوز

پیاده‌سازی مرکزی این دو بخش مجاز است:

1. FP-02 Core Opportunity Projection
2. IC-14 read implementation در برابر `AC2DecisionPort` تزریقی

این نخستین مجوز واقعی کدنویسی FP-02 است، اما دامنه‌ی آن بسته و محدود است.

## ۲. فقط منابع ضروری

بخوان:

- `PHASE_5B1_FP02_DESIGN_REMEDIATION/05_PROJECTION/FP02_EVENT_SOURCED_PROJECTION_RULES.md`
- `PHASE_5B1_FP02_DESIGN_REMEDIATION/06_FP02_CONTRACT/FP02_FINAL_IMPLEMENTATION_CONTRACT_v2_CANDIDATE.md`
- `PHASE_5B1_FP02_DESIGN_REMEDIATION/07_ACCEPTANCE_TESTS/FP02_ACCEPTANCE_TEST_CONTRACT_v2.md`
- `PHASE_5B2_FINAL_SECURITY_CLOSURE/FP02_AC2_AND_EVIDENCE_DELIVERY_CONTRACT.md`
- `PHASE_5B2_FINAL_SECURITY_CLOSURE/FP02_ACCEPTANCE_DELTA.md`
- `PHASE_5B3_AC2_PORT_SHAPE_CORRECTION/AC2_DECISION_PORT_FINAL_DELTA.md`
- `PHASE_5B3_AC2_PORT_SHAPE_CORRECTION/ACCEPTANCE_DELTA.md`
- `implementation/shared-contracts/types.ts`
- `implementation/prisma/schema.prisma`
- `implementation/test/mocks/mock-ic14-read-interface.ts`
- تست‌های فعلی F-04 و FP-01.

ADR/IC را فقط در صورت تعارض واقعی بازخوانی کن؛ یافته‌های بسته‌شده را دوباره تحقیق نکن.

## ۳. فایل‌های مجاز

ایجاد/تغییر فقط در:

- `implementation/foundation/opportunity-projection/**`
- `implementation/foundation/opportunity-read/**`
- `implementation/foundation/access-decision/**` — فقط Port/interface، بدون Adapter واقعی Governance
- `implementation/test/foundation/opportunity-projection/**`
- `implementation/test/foundation/opportunity-read/**`
- `implementation/test/mocks/**` فقط برای Fake جدید AC-2 و Wiring تست
- تنظیمات تست فقط اگر برای اجرای تست‌های جدید ضروری باشد.

تغییر `package.json` فقط اگر کاملاً ضروری باشد؛ انتظار فعلی: صفر dependency جدید.

## ۴. فایل‌های ممنوع

تغییر نده:

- Frozen Architecture/ADR/IC؛
- `implementation/shared-contracts/types.ts`؛
- `implementation/prisma/schema.prisma` و Migrationها، مگر تناقض قطعی و مستند کشف شود؛ در آن صورت STOP و CCR بده؛
- FP-01، FP-03؛
- F-01/F-02/F-03/F-04/F-05 source؛
- Mock فعلی IC-14 به‌گونه‌ای که تست‌های موجود ضعیف شوند؛
- Legacy Malino؛
- F-06/F-07، Voice، Telephone.

## ۵. Core Projection

پیاده‌سازی باید:

- فقط `event_log` را بخواند و فقط `opportunity_current_state`/`opportunity_interaction_state` را بنویسد؛
- هر founding `OCCURRENCE` را با correlation ID خودش نگه دارد؛
- هرگز بر اساس `situation_key` merge/dedup نکند؛
- Amendment/Retraction را فقط با target صریح همان correlation chain اعمال کند؛
- زنجیره‌ی business (`capacity/cancellation/followup`) را از `opportunity.interaction` جدا نگه دارد؛
- interaction هرگز materiality/audience/evidence/latest business event را تغییر ندهد؛
- `as_of_time` را صریح دریافت کند؛ از زمان پنهان داخل تابع محاسبه استفاده نکند؛
- Retraction یا عبور از `expires_at` را به `EXPIRED` نگاشت کند؛
- EXPIRED را در Projection نگه دارد؛ Feed پیش‌فرض بعداً آن را فیلتر کند؛
- Replay با Event history و `as_of_time` یکسان، deterministic و idempotent باشد؛
- عملیات rebuild هر organization را تا حد ممکن transactionally انجام دهد تا Projection نیمه‌کاره عرضه نشود؛
- هیچ Event Log write نداشته باشد.

## ۶. AC2DecisionPort

Port implementation-level نهایی را دقیقاً طبق Phase 5B.3 پیاده کن:

- ورودی: ActorContext + Candidateهای شامل organization، correlation ID، `subject_core_entity_refs` و `evidence_refs`؛
- خروجی: allow/deny + `authorized_evidence_refs`؛
- تصمیم متعلق به Governance است؛ FP-02 فقط مصرف می‌کند؛
- در این فاز فقط Interface و Fakeهای تست مجازند؛ Adapter واقعی Governance/Malino ممنوع است؛
- خطا، نتیجه‌ی مفقود یا نامعتبر → deny؛
- Evidence خروجی = intersection دقیق Candidate و authorized list؛
- Evidence خارجی تزریق‌شده توسط Port نادیده گرفته شود؛
- بدون مجوز صریح: `evidence_refs: []`.

## ۷. IC-14 واقعی

پیاده‌سازی `IC14ReadInterface` باید:

1. `ActorContext` معتبرشده را دریافت کند؛ Authentication بیرون این Interface باقی می‌ماند.
2. فقط Candidateهای همان organization را همراه subject refs به‌صورت داخلی بخواند.
3. AC2DecisionPort را فراخوانی کند.
4. deny/unknown را حذف کند.
5. سپس intended_audience را اعمال کند.
6. سپس actor-specific state را اضافه کند.
7. سپس group/sort/pagination را اعمال کند.

الزامات:

- Feed پیش‌فرض فقط ACTIVE؛ by-id می‌تواند EXPIRED را طبق قرارداد برگرداند.
- sort فقط درون هر domain family بر اساس materiality و قواعد موجود.
- هیچ Domain detection logic در read path.
- هیچ داده‌ی subject refs داخلی مستقیماً در DTO خروجی افشا نشود.
- status/error/payload نباید وجود داده‌ی سازمان دیگر را افشا کند.

## ۸. Situation Lookup خارج از مجوز

در این فاز پیاده نکن:

- `SituationLookupInterface`؛
- Wiring آن به Value Engineها؛
- uniqueness/concurrency solution؛
- lifecycle تصمیم‌گیری Producer.

دلیل: در صورت چند OCCURRENCE هم‌`situation_key`، قرارداد خروجی تک‌موردی هنوز ابهام دارد. این مسیر مستقل باقی می‌ماند و نباید Core FP-02 را آلوده کند.

## ۹. تست‌های الزامی

همه‌ی ۷۵ تست قبلی باید بدون حذف/تضعیف باقی بمانند.

تست‌های جدید با PostgreSQL واقعی، حداقل:

- Occurrence → ACTIVE Projection؛
- Amendment صریح فقط target خودش را به‌روزرسانی می‌کند؛
- Retraction → EXPIRED؛
- expiry با `as_of_time`؛
- deterministic replay؛
- idempotent rebuild؛
- دو OCCURRENCE هم‌`situation_key` دو Projection مستقل؛
- interaction/business separation؛
- actor-state isolation؛
- tenant isolation؛
- AC-2 allow/deny/error/missing decision؛
- AC-2 قبل از audience/state؛
- Evidence subset intersection؛
- Evidence injection rejection؛
- Evidence default `[]`؛
- Feed ACTIVE-only؛
- by-id cross-tenant denial؛
- no direct Event Log write؛
- no direct Prisma access outside Foundation؛
- عدم تغییر تست‌های امنیتی موجود F-04.

تست‌های موجود F-04 را علیه implementation واقعی نیز اجرا کن؛ Mock قبلی را حذف نکن.

## ۱۰. کیفیت و وابستگی

- صفر dependency پولی؛
- صفر AI؛
- ترجیحاً صفر dependency جدید؛
- از Prisma/PostgreSQL موجود استفاده کن؛
- Jest serialization فعلی را حفظ کن؛
- هیچ راه‌حل in-memory برای صحت persistence ادعا نکن.

## ۱۱. اعتبارسنجی

اجرا و ثبت کن:

- TypeScript typecheck؛
- Prisma validate؛
- کل Jest suite؛
- boundary checks؛
- cross-feature import checks؛
- direct-Prisma checks؛
- Event Log write-path checks؛
- جست‌وجوی تغییر Shared Contract/Frozen Architecture.

اگر تست flaky است، FAIL محسوب شود.

## ۱۲. توقف روی تعارض

اگر پیاده‌سازی نیازمند تغییر Shared Contract، schema مشترک، ADR/IC یا Feature source شد:

- آن تغییر را اعمال نکن؛
- `CONTRACT_CHANGE_REQUEST` یا `ARCHITECTURE_CHANGE_REQUEST` بساز؛
- سایر بخش‌های مستقل امن را کامل کن؛
- وضعیت را صادقانه گزارش کن.

## ۱۳. تحویل

ایجاد کن:

- `implementation/FP02_IMPLEMENTATION_STATUS.md`
- `implementation/FP02_VALIDATION_RESULTS.md`
- `implementation/FP02_CONTRACT_COMPLIANCE_REPORT.md`
- `implementation/FP02_SECURITY_EVIDENCE.md`
- `implementation/FP02_CHANGED_FILES.md`
- checksum manifest.

ZIP:

`C:\mlino code\MLINO_FP02_CORE_IMPLEMENTATION_REVIEW_PACK.zip`

شامل source واقعی، تست‌ها، schema/config/package manifests و اسناد تحویل؛ بدون `node_modules`، `.env`، secrets، DB volumes، build output یا آرشیوهای نامرتبط.

## ۱۴. حکم و توقف

فقط یکی:

- `FP-02 CORE IMPLEMENTATION — READY FOR CENTRAL CODE REVIEW`
- `FP-02 CORE IMPLEMENTATION — BLOCKED`

این حکم مجوز Wave 2، Wiring واقعی Governance/Malino، Situation Lookup، F-06/F-07 یا Deployment نیست.

پس از ZIP، تحویل استاندارد `AI_HANDOFF` را با HANDOFF_ID جدید ثبت کن و متوقف شو.
