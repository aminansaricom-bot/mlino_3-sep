# MLINO — PHASE 5B.2
# FINAL FP-02 SECURITY CONTRACT CLOSURE

INSTRUCTION_ID: CODEX-20260815-2242-PHASE5B2
AUTHOR: CODEX
STATUS: READY_FOR_CLAUDE
TARGET_HANDOFF_ID: HANDOFF-20260815-2227-PHASE5B1
TARGET_REPORT_PATH: C:\mlino code\AI_HANDOFF\CLAUDE_REPORTS\20260815_2227_PHASE_5B1_FP02_DESIGN_REMEDIATION_REPORT.md
TARGET_REPORT_SHA256: 5515009c7199f7e015268c835acfd94d446dbfad80f21339b46f243461d1d975
TARGET_ZIP_PATH: C:\mlino code\MLINO_PHASE_5B1_FP02_DESIGN_REMEDIATION.zip
TARGET_ZIP_SHA256: 1b3e864a1f21ba5cd16d705ceeb24308acf26a9e037b45f6ee88bb6da836d573
REVIEW_COMPLETED_AT: 2026-08-15T22:42:55.4000828+03:30
AUTHORIZATION_SCOPE: TWO_ITEM_DESIGN_CLOSURE_ONLY_NO_IMPLEMENTATION

## ۱. نتیجه‌ی بازبینی

اصلاحات CR-01 تا CR-05 و CR-07 پذیرفته شدند. آن‌ها را دوباره تحلیل یا بازنویسی نکن.

موارد پذیرفته‌شده:

- حذف کامل implicit merge؛
- Projection بر اساس correlation chain صریح؛
- جدایی business/interaction chain؛
- Advisory بودن Situation Lookup؛
- OPEN ماندن R5-Concurrency؛
- OPEN ماندن R4؛
- ماتریس Feature-specific چرخه‌ی حیات؛
- Replay با `as_of_time` صریح.

فقط دو اصلاح امنیتی زیر باقی مانده است.

## ۲. S1 — Authentication Context با AC-2 یکی نیست

کد واقعی FP-03 فقط این کارها را انجام می‌دهد:

- اعتبارسنجی JWT؛
- استخراج `organization_id`، `actor_id` و `role`؛
- تولید `ActorContext`.

بنابراین:

`resolveActorContext ≠ AC-2 decision`

FP-03 یک Authentication/Context Adapter فعلی است، نه Capability «Trust, Explainability & Governance» و نه تصمیم دسترسی محتوایی.

تصحیح لازم:

- عبارت‌هایی را که خروجی موفق `resolveActorContext` را معادل تصمیم AC-2 می‌دانند حذف کن.
- یک Port داخلی و حداقلی برای **مصرف تصمیم AC-2** توسط FP-02 تعریف کن. نام دقیق implementation-level است؛ مالک تصمیم باید Trust/Governance باقی بماند و FP-02 فقط مصرف‌کننده باشد.
- Shared Contract v1.1 را تغییر نده.
- Port باید بتواند برای هر Opportunity نامزد، نتیجه‌ی allow/deny و وضعیت مجاز Evidence را به‌شکل fail-closed برگرداند.
- اگر authority unavailable/unknown بود، نتیجه deny/withhold باشد؛ هیچ auto-allow مجاز نیست.

ترتیب صحیح IC-14:

1. `resolveActorContext` برای authentication و tenant context؛
2. خواندن حداقلی و tenant-scoped نامزدها/subject refs موردنیاز تصمیم؛
3. مصرف تصمیم AC-2 از Port متعلق به Governance؛
4. حذف Opportunityهای deny‌شده؛
5. `intended_audience`؛
6. actor-specific state؛
7. grouping/sorting.

تصحیح مهم: IC-14 الزام می‌کند AC-2 قبل از audience و actor-state باشد، نه لزوماً قبل از هر Query داخلی. برای تصمیم AC-2 ممکن است ابتدا یک خواندن حداقلی و tenant-scoped جهت دریافت subject/content refs لازم باشد. این خواندن نباید داده‌ای به caller افشا کند یا existence oracle بسازد.

## ۳. S2 — سیاست موقت و ایمن Evidence در IC-14

برای بستن ابهام تست شماره ۹، این تصمیم implementation-level را ثبت کن:

- FP-02 در Projection، `evidence_refs` opaque را بدون Resolve و بدون تغییر نگه می‌دارد.
- FP-01 به‌دلیل عدم Resolve آن‌ها Candidate را رد نمی‌کند.
- IC-14 فقط EvidenceRefهایی را در خروجی قرار می‌دهد که Port تصمیم AC-2 صریحاً مجاز اعلام کرده باشد.
- اگر Evidence authorization تعریف نشده، unavailable، unknown یا deny باشد، خروجی باید:

  `evidence_refs: []`

- این رفتار schema-compatible و fail-closed است؛ حذف فیلد یا تغییر Shared Contract لازم نیست.
- نبود Connector Malino نباید Core Projection را متوقف کند.
- Resolve/Dereference شواهد همچنان خارج از FP-02 و R4 همچنان OPEN است.

این سیاست را Architecture Fact معرفی نکن؛ آن یک **V1 IMPLEMENTATION SECURITY POLICY** برای رعایت Privacy Boundary منجمد IC-14 است.

## ۴. مرز آمادگی

پس از این اصلاح، وضعیت‌ها را دقیقاً تفکیک کن:

- FP-02 Core Projection: قابل توصیه برای پیاده‌سازی مرکزی.
- IC-14 implementation: قابل پیاده‌سازی در برابر AC-2 Decision Port و Fake/Mock قراردادی؛ Production integration تا وجود Adapter واقعی AC-2، CONDITIONAL.
- Situation Lookup: فقط Advisory؛ قابل پیاده‌سازی اما فعلاً نباید به F-01/F-02/F-03 برای تصمیم lifecycle متصل شود.
- Evidence Resolve: خارج از FP-02 و OPEN.
- R5-Concurrency: OPEN و خارج از دامنه‌ی پیاده‌سازی Core FP-02.

## ۵. تست‌های قراردادی لازم

فقط قرارداد تست را اصلاح کن؛ تست یا کد ننویس:

1. Authentication success بدون AC-2 allow، هیچ Opportunity عرضه نمی‌کند.
2. AC-2 deny قبل از audience/state، Opportunity را حذف می‌کند.
3. AC-2 unavailable/unknown، fail-closed است.
4. خواندن اولیه‌ی tenant-scoped هیچ داده‌ای به caller افشا نمی‌کند.
5. Opportunity مجاز با Evidence نامجاز، با `evidence_refs: []` عرضه می‌شود.
6. فقط EvidenceRefهای صریحاً مجاز عرضه می‌شوند.
7. نبود Evidence Resolver مانع Projection نیست.
8. Situation Lookup هیچ lifecycle write یا Feature wiring ایجاد نمی‌کند.

## ۶. خروجی حداقلی

برای کاهش مصرف و جلوگیری از مستندسازی تکراری، فقط این مسیر و فایل‌ها را بساز:

`PHASE_5B2_FINAL_SECURITY_CLOSURE/`

- `FP02_AC2_AND_EVIDENCE_DELIVERY_CONTRACT.md`
- `FP02_IMPLEMENTATION_SCOPE_GATE.md`
- `FP02_ACCEPTANCE_DELTA.md`
- `MLINO_PHASE_5B2_FINAL_SECURITY_CLOSURE_REPORT.md`
- `FILE_MANIFEST.sha256`

در گزارش، فقط Delta نسبت به Phase 5B.1 را بنویس؛ تاریخچه‌ی کامل پروژه را تکرار نکن.

ZIP:

`C:\mlino code\MLINO_PHASE_5B2_FINAL_SECURITY_CLOSURE.zip`

چون هیچ کدی مجاز به تغییر نیست، اجرای مجدد Jest/TypeScript/Prisma لازم نیست. فقط تأیید کن فایل‌های `implementation/` تغییر نکرده‌اند و چک‌سام ZIP/Manifest را بساز.

## ۷. ممنوعیت‌ها

انجام نده:

- پیاده‌سازی FP-02 یا IC-14؛
- تغییر کد یا تست؛
- تغییر Prisma/Migration؛
- تغییر Shared Contract v1.1؛
- تغییر ADR/IC/Kernel؛
- طراحی Connector Malino؛
- حل R5-Concurrency؛
- اتصال Situation Lookup به Value Engineها؛
- شروع Wave 2، F-06/F-07، Voice یا Telephone.

## ۸. حکم و توقف

فقط یکی:

- `PHASE 5B.2 — FINAL FP-02 CONTRACT READY FOR CENTRAL REVIEW`
- `PHASE 5B.2 — BLOCKED`

پس از ساخت ZIP، تحویل استاندارد `AI_HANDOFF` را با HANDOFF_ID جدید ثبت کن و متوقف شو. هیچ پیاده‌سازی را آغاز نکن.
