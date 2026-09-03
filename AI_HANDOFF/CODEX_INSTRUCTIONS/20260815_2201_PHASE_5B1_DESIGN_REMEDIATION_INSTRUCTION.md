# MLINO — PHASE 5B.1
# FP-02 DESIGN REMEDIATION BEFORE IMPLEMENTATION AUTHORIZATION

INSTRUCTION_ID: CODEX-20260815-2201-PHASE5B1
AUTHOR: CODEX
STATUS: READY_FOR_CLAUDE
TARGET_HANDOFF_ID: HANDOFF-20260815-2153-PHASE5B
TARGET_REPORT_PATH: C:\mlino code\AI_HANDOFF\CLAUDE_REPORTS\20260815_2153_PHASE_5B_FP02_FINAL_DESIGN_REPORT.md
TARGET_REPORT_SHA256: 736ba66d089c8972999f0f27ac9b2dd7e29af861461dc3797c84e606b5b334ab
TARGET_ZIP_PATH: C:\mlino code\MLINO_PHASE_5B_FP02_FINAL_DESIGN.zip
TARGET_ZIP_SHA256: 527ac9e2dcf4d8a9017ced290ec22cc01c2d8b5277a3fbdea014c4354170786a
REVIEW_COMPLETED_AT: 2026-08-15T22:01:15.5668136+03:30
AUTHORIZATION_SCOPE: DESIGN_REMEDIATION_ONLY_NO_FP02_IMPLEMENTATION

## ۰. حکم بازبینی مرکزی

بسته‌ی Phase 5B از نظر ساختاری سالم است، تمام ۱۷ چک‌سام داخلی آن معتبرند و اعتبارسنجی مستقل فعلی نیز سبز است:

- TypeScript: PASS
- Prisma: PASS
- Jest: 75/75 PASS

اما نتیجه‌ی طراحی فعلی هنوز مجوز امن برای پیاده‌سازی FP-02 ایجاد نمی‌کند.

وضعیت بازبینی:

`PHASE 5B — DIRECTIONALLY ACCEPTED / DESIGN REMEDIATION REQUIRED`

این مأموریت فقط برای اصلاح اسناد طراحی است.

## ۱. توقف مطلق پیاده‌سازی

در این مأموریت مطلقاً انجام نده:

- پیاده‌سازی FP-02؛
- پیاده‌سازی واقعی IC-14؛
- تغییر کد F-01 تا F-07؛
- تغییر FP-01 یا FP-03؛
- تغییر Prisma schema یا Migration؛
- تغییر Shared Contract v1.1؛
- تغییر Frozen Architecture، ADR یا IC؛
- شروع Connector Malino؛
- شروع Wave 2؛
- شروع Voice یا Telephone Agent.

فقط اسناد Phase 5B را به‌صورت نسخه‌ی اصلاحی جدید تولید کن. نسخه‌ی قبلی را بازنویسی یا حذف نکن.

## ۲. منابع الزامی

پیش از اصلاح، مستقیماً این منابع را بخوان:

- `ARCHITECTURE_BASELINES/MLINO_V1_CORE_BASELINE_001/governance/ADR-00AC-Opportunity-Architecture.md`
- `ARCHITECTURE_BASELINES/MLINO_V1_CORE_BASELINE_001/governance/ADR-00AD-Opportunity-Producer-And-Materiality.md`
- `ARCHITECTURE_BASELINES/MLINO_V1_CORE_BASELINE_001/governance/ADR-00AE-Role-Aware-Opportunity-Delivery.md`
- `ARCHITECTURE_BASELINES/MLINO_V1_CORE_BASELINE_001/architecture/Interaction_Contracts_v1.1_FROZEN.md`، به‌ویژه IC-13 و IC-14
- `PHASE_4A_IMPLEMENTATION_DESIGN/02_DATABASE/V1_DATABASE_DESIGN.md`
- Feature Contractهای F-01، F-02، F-03 و F-04
- بسته‌ی FP-02 در Phase 4B
- Shared Implementation Contract v1.1 Frozen
- Prisma schema و کد واقعی Wave 1
- تمام اسناد Phase 5B قبلی

هر نتیجه را به یکی از این طبقات نسبت بده:

- FROZEN ARCHITECTURE DERIVATION
- IMPLEMENTATION CONTRACT
- IMPLEMENTATION DESIGN
- CONTRACT GAP
- ARCHITECTURE CONFLICT
- OPEN QUESTION

## ۳. CR-01 — معنای Evidence و تناقض Admission/Resolve

Phase 5B دو رفتار ناسازگار ثبت کرده است:

1. Shared Contract v1.1 می‌گوید `EvidenceRef` opaque است و وجود، ماندگاری، قابلیت Resolve یا Referential Integrity را تضمین نمی‌کند.
2. سند Evidence Phase 5B می‌گوید `not_found`، `cross_tenant` یا `source_unavailable` باید Admission را fail-closed رد کند.

این دو ضمانت هم‌زمان معتبر نیستند.

اصلاح الزامی:

- ضمانت جعلی Admission-time Evidence validation را حذف کن، مگر اینکه قرارداد و Store واقعی و مصوب وجود آن را ثابت کند.
- صریحاً ثبت کن FP-01 در Shared Contract v1.1 مجاز نیست صرفاً بر اساس عدم Resolve یک EvidenceRef opaque، Candidate را رد کند.
- مشخص کن Evidence Resolution در آینده برای کدام مصرف‌کننده و در چه زمانی رخ می‌دهد؛ Admission، Projection و Presentation را مخلوط نکن.
- Privacy Boundary منجمد IC-14 را حل‌نشده رها نکن: IC-14 نباید `evidence_refs` غیرمجاز را عرضه کند. اگر قرارداد فعلی اجازه‌ی تصمیم مجوز روی Evidence را نمی‌دهد، رفتار امن را GAP ثبت کن و ادعای عرضه‌ی امن Evidence نکن.
- هیچ خطای `EVIDENCE_REF_NOT_FOUND` یا `EVIDENCE_REF_CROSS_TENANT` را به v1.1 بازنگردان.

## ۴. CR-02 — «منبع همیشه Malino» یک Architecture Fact نیست

ادعای «منبع شواهد همیشه Malino Legacy است» بیش از شواهد موجود تعمیم یافته است.

آنچه فعلاً قابل اثبات است:

- F-01/F-02/F-03 برای V1 از Projectionهای تغذیه‌شده توسط Connector Malino استفاده خواهند کرد.
- Mockهای Wave 1 فقط رشته‌هایی مانند `eventId` تولید می‌کنند.
- هنوز ثابت نشده این شناسه‌ها دقیقاً به کدام رکورد پایدار Legacy نگاشت می‌شوند یا چگونه Tenant آن‌ها اثبات می‌شود.
- تولیدکنندگان آینده ممکن است منبع دیگری داشته باشند.

اصلاح الزامی:

- عبارت «همیشه Malino» را به «برای سه Producer فعلی V1، منبع بالادستی مورد انتظار Malino/Connector است» محدود کن.
- بدون بازرسی واقعی schema/identity mapping در Malino، ادعای Resolveپذیری یا ماندگاری پایدار نکن.
- `EvidenceResolutionInterface` را Architecture Fact معرفی نکن؛ آن را طراحی نامزد وابسته به Connector ثبت کن.
- CCR مربوط به Evidence Namespace نباید enum بسته‌ی دائمی فقط با `malino_legacy` را راه‌حل نهایی فرض کند؛ توسعه برای تولیدکنندگان آینده باید حفظ شود، بدون طراحی آن‌ها در این فاز.
- R4 باید OPEN یا PARTIALLY CLOSED باقی بماند.

## ۵. CR-03 — ادغام OCCURRENCEها در Projection ممنوع

قاعده‌ی فعلی که چند OCCURRENCE هم‌`situation_key` را به یک Opportunity تبدیل و OCCURRENCEهای بعدی را «Amendment ضمنی» تلقی می‌کند، مجاز نیست.

مرجع:

- ADR-00AC: `opportunity_correlation_id` برابر ID رویداد OCCURRENCE بنیان‌گذار است.
- IC-13: Amendment باید correlation/target صریح حمل کند.
- Phase 4A DB Design: Projection با Replay رویدادهای همان `opportunity_correlation_id` و زنجیره‌ی `amends_event_id` بازسازی می‌شود.
- Explainability کامل اجازه نمی‌دهد OCCURRENCE ثبت‌شده در Projection ضمنی به Amendment تبدیل شود.

اصلاح الزامی:

- قاعده‌ی `implicit amendment` را کاملاً حذف کن.
- FP-02 هر founding OCCURRENCE مستقل را با correlation ID خودش نگه دارد، مگر قرارداد مصوب صریحاً خلاف آن را مقرر کند.
- `situation_key` فقط identity/lookup hint است و اجازه‌ی merge، dedup یا lifecycle rewrite نمی‌دهد.
- Race دو OCCURRENCE هم‌زمان را حل‌شده اعلام نکن. اگر قرارداد اتمیک و مجاز وجود ندارد، آن را `CONTRACT GAP` ثبت کن.
- قفل توزیع‌شده، Dedup Engine، موجودیت یا Capability جدید اختراع نکن.
- اگر راه‌حل به تغییر ADR/IC نیاز دارد، ACR بساز و همان شاخه را متوقف کن.

## ۶. CR-04 — Lookup و Eventual Consistency

`SituationLookupInterface` می‌تواند خوانش باریک Projection باشد، اما Projection eventual-consistent است، Lookup سپس Submit اتمیک نیست و schema قید یکتای active situation ندارد.

اصلاح الزامی:

- Lookup را advisory/read-state contract تعریف کن، نه تضمین uniqueness.
- R5 Lookup را فقط در سطح read contract بسته بدان؛ R5 concurrency/uniqueness را جداگانه OPEN نگه دار.
- FP-02 حق نوشتن Event Log، reservation، lifecycle یا mutation تولیدکننده را ندارد.
- ادعای «همزمانی حل شد» را حذف کن مگر راه‌حل واقعاً atomic، contract-authorized و testable باشد.
- آمادگی FP-02 را تفکیک کن:
  - Core Projection + IC-14 read infrastructure
  - Situation Lookup/lifecycle integration extension

## ۷. CR-05 — اختیار چرخه‌ی حیات باید محدود و Feature-specific باشد

Producer مقدار `event_type` را در Candidate می‌فرستد و مالک منطق تشخیص است؛ اما این به‌تنهایی سیاست RETRACTION، رفتار EXPIRED، Resolution و Suppression هر Feature را ثابت نمی‌کند.

اصلاح الزامی:

- برای F-01، F-02 و F-03 جداگانه authority matrix بساز: OCCURRENCE، AMENDMENT، RETRACTION و expiry response.
- هر خانه‌ی فاقد مرجع را GAP علامت بزن.
- از یک قاعده‌ی عمومی convenience-based استفاده نکن.
- FP-02 فقط وضعیت را گزارش می‌دهد و lifecycle event type را انتخاب نمی‌کند.

## ۸. CR-06 — مرز AC-2 در IC-14 واقعی

نگاشت فعلی، `WHERE organization_id = ?` را تقریباً معادل AC-2 تلقی کرده و نوشته FP-02 «AC-2 را پیاده نمی‌کند».

تفکیک صحیح:

- FP-02 مالک یا تصمیم‌گیر AC-2 نیست.
- پیاده‌سازی واقعی IC-14 باید تصمیم AC-2 را از authority/adapter مجاز مصرف و ترتیب اجباری را enforce کند.
- فیلتر Tenant به‌تنهایی AC-2 نیست.
- Phase 4B، FP-03 را dependency ورودی FP-02 ثبت کرده است.

اصلاح الزامی:

- نشان بده IC-14 چگونه قبل از audience filtering و actor-state lookup، نتیجه‌ی AC-2 را دریافت و fail-closed enforce می‌کند.
- اگر `IC14ReadInterface` v1.1 کافی نیست، آن را تغییر نده؛ CCR ایجاد کن.
- Query نباید پیش از رد AC-2 داده‌ی بیش از حد بخواند یا existence oracle بین‌سازمانی بسازد.
- تست ترتیب فراخوانی و fail-closed بودن AC-2 را تعریف کن.

## ۹. CR-07 — قواعد Projection باید صرفاً Event-Sourced باشند

طراحی اصلاحی باید صریحاً پوشش دهد:

- Grouping فقط بر اساس `opportunity_correlation_id` و زنجیره‌ی صریح Amendment/Retraction.
- رویداد `opportunity.interaction` فقط `OpportunityInteractionState` را تغییر می‌دهد و payload کسب‌وکاری `OpportunityCurrentState` را جایگزین نمی‌کند.
- `latest_event_id` کسب‌وکاری و interaction-state مخلوط نشوند.
- ثابت‌ماندن `core_entity_refs` از founding Event فقط با مرجع معتبر؛ در غیر این صورت GAP.
- Expiry وابسته به زمان است؛ Replay determinism با `evaluation_time/as_of_time` صریح تعریف شود، نه `now` پنهان.
- RETRACTION بدون پاک‌کردن تاریخچه، state را طبق قرارداد معتبر تغییر دهد.

## ۱۰. تست‌های پذیرش اصلاح‌شده

بدون نوشتن تست اجرایی، قرارداد تست آینده را حداقل با این موارد اصلاح کن:

1. هر OCCURRENCE مستقل correlation ID خودش را حفظ می‌کند.
2. دو OCCURRENCE هم‌`situation_key` بدون Amendment صریح merge نمی‌شوند.
3. Amendment فقط زنجیره‌ی هدف صریح خودش را تغییر می‌دهد.
4. Interaction Event payload کسب‌وکاری Opportunity را تغییر نمی‌دهد.
5. AC-2 قبل از audience و actor-state اجرا می‌شود.
6. AC-2 unavailable/deny باعث fail-closed و عدم افشای existence می‌شود.
7. Tenant isolation در Feed، by-id، Lookup و actor-state.
8. EvidenceRef opaque بدون Store باعث Admission rejection جعلی نمی‌شود.
9. Evidence غیرمجاز از IC-14 خارج نمی‌شود؛ اگر authorization تعریف نشده، مورد BLOCKED بماند.
10. Replay با `as_of_time` ثابت deterministic است.
11. Lookup stale/lag semantics صریح و قابل‌آزمایش است.

تست نباید تصمیم معماری حل‌نشده اختراع کند.

## ۱۱. مدیریت CCR/ACR

سه CCR فعلی را بازبینی کن:

- Evidence Integrity
- Opportunity Identity Lookup
- Evidence Namespace v1.2 Candidate

برای هرکدام فقط یکی از `OPEN`، `PARTIALLY CLOSED`، `CLOSED` یا `SUPERSEDED` ثبت کن. عبارت «باز اما عملاً حل‌شده» ممنوع است.

اگر Shared Contract v1.1 کافی نیست، آن را تغییر نده؛ CCR حداقلی ایجاد کن. اگر ADR/IC مانع راه‌حل لازم است، ACR ایجاد و آن شاخه را متوقف کن.

## ۱۲. خروجی‌های الزامی

ایجاد کن:

`PHASE_5B1_FP02_DESIGN_REMEDIATION/`

حداقل شامل:

- `00_MASTER_REPORT/MLINO_PHASE_5B1_FP02_DESIGN_REMEDIATION_REPORT.md`
- `01_EVIDENCE/EVIDENCE_SEMANTICS_CORRECTION.md`
- `02_SITUATION_LOOKUP/SITUATION_LOOKUP_AND_CONCURRENCY_CORRECTION.md`
- `03_LIFECYCLE/LIFECYCLE_AUTHORITY_MATRIX.md`
- `04_IC14/IC14_AC2_ORCHESTRATION_CORRECTION.md`
- `05_PROJECTION/FP02_EVENT_SOURCED_PROJECTION_RULES.md`
- `06_FP02_CONTRACT/FP02_FINAL_IMPLEMENTATION_CONTRACT_v2_CANDIDATE.md`
- `07_ACCEPTANCE_TESTS/FP02_ACCEPTANCE_TEST_CONTRACT_v2.md`
- `08_CHANGE_CONTROL/CCR_STATUS_REGISTER.md`
- `09_SECURITY/FP02_SECURITY_REVIEW_v2.md`
- `10_VALIDATION/VALIDATION_RESULTS.md`
- `11_MANIFEST/PHASE_5B1_FILE_MANIFEST.sha256`

ZIP:

`C:\mlino code\MLINO_PHASE_5B1_FP02_DESIGN_REMEDIATION.zip`

## ۱۳. معیار حکم نهایی

فقط یکی از این دو حکم مجاز است:

- `PHASE 5B.1 — FP-02 DESIGN READY FOR CENTRAL REVIEW`
- `PHASE 5B.1 — FP-02 DESIGN BLOCKED`

توصیه‌ی `FP-02 IMPLEMENTATION READY` فقط در صورتی مجاز است که implicit merge حذف، Projection صرفاً correlation-chain-based، AC-2 orchestration روشن، Evidence semantics سازگار و R5 concurrency صادقانه تفکیک شده باشد و هیچ Worker مجبور به اختراع lifecycle/security semantics نباشد.

حتی در صورت READY، FP-02 را اجرا نکن. Central Review بعدی مجوز جداگانه صادر می‌کند.

## ۱۴. تحویل از طریق AI_HANDOFF

پس از تکمیل:

1. گزارش آرشیوی Claude را در `AI_HANDOFF/CLAUDE_REPORTS/` بنویس.
2. همان گزارش را پس از تکمیل در `CLAUDE_LATEST_REPORT.md` قرار بده.
3. `HANDOFF_STATE.md` را با HANDOFF_ID جدید و `STATUS: WAITING_FOR_CODEX_REVIEW` به‌روزرسانی کن.
4. SHA-256 گزارش و ZIP را ثبت کن.
5. متوقف شو.

هیچ فاز یا پیاده‌سازی بعدی را آغاز نکن.
