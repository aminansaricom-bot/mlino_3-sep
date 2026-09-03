# گزارش پاس تسویه‌ی قرارداد Wave 1 (R4/R5/R6)

## ۱. حکم اجرایی (Executive Verdict)

**WAVE 1 CONTRACT RESOLUTION — READY FOR CENTRAL REVIEW**

R6 به‌طور کامل بسته شد (تصحیح قرارداد اعمال‌شده، کد به‌روزشده، تست‌شده). R5 در سطح «محاسبه‌ی هویت» بسته شد؛ منطق کامل تصمیم چرخه‌ی حیات (Occurrence/Amendment) عمداً به FP-02 موکول ماند — این یک محدودیت دامنه‌ی از‌پیش‌اعلام‌شده است، نه یک شکست. R4 نتوانست بسته شود — تلاش برای پیاده‌سازی یک یافته‌ی معماری واقعی و جدید را آشکار کرد (evidence_refs به رویدادهای منبع خارجی، نه event_log، اشاره می‌کنند) و به‌درستی BLOCKED طبقه‌بندی شد، به‌جای این‌که با بررسی نادرست «سبز» جلوه داده شود.

## ۲. تأیید Baseline منجمد

بدون تغییر در Kernel v1.3، ADR-00AC/AD/AE، یا `Interaction_Contracts_v1.1_FROZEN.md`. هر تغییر این پاس در سطح Phase 4B (Shared Implementation Contract) یا پایین‌تر است.

## ۳. تأیید قرارداد مشترک

نسخه‌ی پایه v1 تأیید شد بدون رانش. نسخه‌ی نامزد جدید v1.1 در [[SHARED_CONTRACT_vNEXT_FREEZE_CANDIDATE/]] — **هنوز رسماً منجمد نیست.**

## ۴. حل R4 (یکپارچگی Evidence)

**نتیجه: BLOCKED — نه CLOSED.**

Central Review اصل («وجود Event + تطابق سازمان») را تصویب اصولی کرد. پیاده‌سازی این حداقل در `admission-validator.ts` بلافاصله هر سه سناریوی معتبر F-01/F-02/F-03 را رد کرد، چون `evidence_refs[].event_id` در این سه Feature به شناسه‌های رویداد **منبع خارجی** (`appointment.scheduled`, `working_hours.defined`, `appointment.cancelled`, `appointment.noshow`, `patient.interaction_recorded`) اشاره می‌کند — نه به ردیف‌های جدول `event_log` ما (که فقط رویدادهای دامنه‌ی `opportunity.*` پذیرفته‌شده را نگه می‌دارد). هیچ Connector/Projection برای رویدادهای منبع خارجی در این کدبیس وجود ندارد (FP-02/اتصال واقعی Malino، خارج از دامنه). بررسی حذف شد؛ کد به رفتار قبلی (بدون بررسی evidence) بازگشت. CCR به‌روزرسانی شد: [[../remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_EVIDENCE_INTEGRITY.md]].

## ۵. حل R5 (هویت وضعیت کسب‌وکار)

**نتیجه: مشخصات هویت CLOSED برای هر سه Feature؛ منطق چرخه‌ی حیات کامل عمداً موکول‌شده (نه یک شکست).**

سند کامل: [[R5_STABLE_SITUATION_IDENTITY_SPEC.md]]. برای هر سه Feature، `situation_key` قطعی محاسبه، به `EventCandidateDTO` افزوده، و در `event_log` ماندگار می‌شود. منطق «آیا Opportunity باز موجودی برای این وضعیت هست» (که برای انتخاب واقعی Occurrence/Amendment لازم است) نیازمند دانستن وضعیت ACTIVE/EXPIRED است — دقیقاً کار FP-02 — و طبق دستور صریح («موتور Dedup نساز») پیاده نشد.

## ۶. هویت وضعیت F-01

`{organization_id, entityRef, date}` — تأیید‌شده با متن Feature Contract (بند ۲۱: «شناسه‌ی بازه‌ی زمانی/کلینیک»). محدودیت داده‌ی شناخته‌شده: Repository فعلی فقط یک وضعیت به‌ازای هر (منبع، تاریخ) پشتیبانی می‌کند — نه چندین شیفت/بازه‌ی مجزا.

## ۷. هویت وضعیت F-02

`{organization_id, appointmentId}` — تأیید‌شده مستقیم با متن Feature Contract (بند ۲۱: «شناسه‌ی نوبت»). ساده‌ترین و کامل‌ترین مورد.

## ۸. هویت وضعیت F-03

`{organization_id, patientEntityRef, lastInteractionAt}` — تأیید‌شده با متن Feature Contract (بند ۲۱: «شناسه‌ی بیمار + بازه‌ی زمانی»)؛ برخلاف حدس اولیه (که این Feature را BLOCKED می‌پنداشت)، خواندن دقیق بند ۲۱ سرنخ کامل را داد.

## ۹. حل R6 (Actor/CoreEntity)

**نتیجه: CLOSED — از طریق تصحیح کنترل‌شده‌ی Shared Contract.**

`ActorCoreEntityId` به `CoreEntityId` (فقط subject) + `ActorId` (جدید، فقط actor) تفکیک شد. `ActorContext.actor_core_entity_id` → `actor_id`؛ `InteractionRecordPayload.actor_core_entity_id` → `actor_id`. F-04 اکنون `core_entity_refs: []` می‌فرستد؛ FP-01 آن را از رویداد Occurrence بنیان‌گذار هدف پر می‌کند (AC-1 از طریق موضوع واقعی برآورده می‌شود، نه actor). جزئیات کامل: [[R6_ACTOR_SUBJECT_CONTRACT_CHANGE.md]].

## ۱۰. تغییرات قرارداد مشترک

نسخه v1 → v1.1 (نامزد). دیف کامل: [[SHARED_CONTRACT_vNEXT_CHANGELOG.md]]. همه‌ی تغییرات مستقیماً به R5/R6 برمی‌گردند؛ بدون تغییر نامرتبط.

## ۱۱. تغییرات Feature Contract

`implementation/FP01_REVIEW_MAP.md`، `FP03_REVIEW_MAP.md`، `FEATURE_REVIEW_MAP.md`، `DATABASE_REVIEW_MAP.md` — هرکدام یک یادداشت پاس Contract Resolution دریافت کردند. بسته‌های رسمی Phase 4B (`03_FEATURE_PACKAGES/`) **بازنویسی نشدند** — کهنه‌شدنشان و اولویت بازتولید در [[FEATURE_WORKSPACE_IMPACT.md]] مستند شده.

## ۱۲. تأثیر پایگاه‌داده

یک Migration (`20260815033018_add_situation_key`) — ستون Nullable + ایندکس، بدون Constraint یکتا، بدون Backfill. جزئیات کامل: [[DB_IMPACT_REVIEW.md]].

## ۱۳. تغییرات پیاده‌سازی

فایل‌های جدید: `foundation/event-admission/situation-key.ts`. فایل‌های ویرایش‌شده: `shared-contracts/types.ts`، `foundation/auth-adapter/auth-adapter.ts`، `foundation/event-admission/admission-validator.ts`، `foundation/event-admission/candidate-structural-validator.ts`، `foundation/event-admission/event-admission.service.ts`، `foundation/event-log/event-log.service.ts`، `feed/opportunity-feed.service.ts`، سه Value Engine (`capacity`/`cancellation`/`followup-detector.service.ts`)، `prisma/schema.prisma`. **صفر تغییر** در فایل‌های F-01 تا F-05 که به منطق تشخیص/عرضه‌ی محصول مربوط باشد (فقط افزودن `situation_key`/تغییر شکل core_entity_refs — هر دو مکانیکی).

## ۱۴. بررسی امنیتی

جداسازی Tenant (تأیید مجدد، SECURITY 1-4 سبز)؛ رد Evidence بین‌سازمانی (N/A — R4 پیاده نشد)؛ رد Amendment بین‌سازمانی (بدون تغییر از پاس قبلی، هم‌چنان سبز)؛ جداسازی وضعیت actor (بدون تغییر، سبز)؛ Fail-Closed JWT (بدون تغییر از R7، سبز — فقط نام فیلد claim تغییر کرد)؛ ترتیب مجوز AC-2→intended_audience→actor-state (بدون تغییر، سبز)؛ نوشتن کنترل‌شده‌ی Event Log (تأیید مجدد: تنها یک محل نوشتن).

## ۱۵. بررسی مرز Feature

F-01 هم‌چنان Capacity؛ F-02 هم‌چنان Cancellation؛ F-03 هم‌چنان Follow-up (بدون اقدام اجرایی)؛ F-04 هم‌چنان Feed/Projection consumer (نه تشخیص‌دهنده — تست معماری موجود هم‌چنان سبز)؛ F-05 دست‌نخورده.

## ۱۶. حفظ تست‌های موجود

هر ۶۵ تست پس از اصلاح جراحی (Remediation) حفظ شدند؛ فقط فایل‌های حاوی `actor_core_entity_id` (نام فیلد تغییریافته) باید هم‌گام به‌روزرسانی می‌شدند (تغییر نام، نه تغییر ادعا) — `opportunity-feed.spec.ts` هم علاوه‌بر تغییرنام، Seed یک CoreEntity غیرضروری برای actor را حذف کرد (خودش اثبات مستقیم رفع R6 است).

## ۱۷. تست‌های جدید

۱۰ تست جدید: ۲ تست R6 (`opportunity-feed.spec.ts`)، ۴ تست واحد `computeSituationKey` (`situation-key.spec.ts`)، ۶ تست یکپارچگی R5 (۲ به‌ازای هر Value Engine، در فایل‌های تست موجودشان).

## ۱۸. اعتبارسنجی کامل

| بررسی | نتیجه |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx prisma validate` | PASS |
| `npx prisma migrate status` | «Database schema is up to date!» (۲ Migration) |
| `npx jest` | PASS — ۱۰ Suite، ۷۵ تست |
| بررسی مرز معماری (Import بین‌Feature، دسترسی مستقیم Prisma) | PASS — صفر تخلف |
| مسیر نوشتن Event Log | PASS — تنها یک محل |

## ۱۹. درخواست‌های تغییر قرارداد

۱ مورد باز/به‌روزشده: [[../remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_EVIDENCE_INTEGRITY.md]] (R4، اکنون BLOCKED با یافته‌ی جدید).
۲ مورد از پاس قبلی هم‌چنان باز: [[../remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_OPPORTUNITY_IDENTITY.md]] (بخشی حل‌شده — مشخصات هویت بسته شد؛ خودِ مکانیزم Lookup هنوز باز است)، [[../remediation/CONTRACT_CHANGE_REQUEST_ACTOR_COREENTITY.md]] (این پاس دقیقاً همین را حل کرد — قابل بسته‌شدن توسط بازبینی مرکزی).

## ۲۰. درخواست‌های تغییر معماری

**صفر.** هیچ‌کدام از R4/R5/R6 نیازمند تغییر Kernel/ADR/IC نبود.

## ۲۱. مانع باقی‌مانده و توصیه‌ی آمادگی FP-02

**مانع باقی‌مانده: یک مورد — R4 (BLOCKED).** این مانع evidence_refs را متأثر می‌کند، نه مسیر اصلی پذیرش/Amendment/Idempotency.

**توصیه:** FP-02 + IC-14 واقعی از نظر R5/R6 آماده است؛ R4 نیازمند یک تصمیم معماری صریح پیش از هرگونه اجرای evidence-integrity است (به‌ویژه چون FP-02 دقیقاً همان لایه‌ای است که Projection/Connector منبع خارجی را خواهد ساخت — یعنی R4 احتمالاً طبیعتاً هم‌زمان با FP-02 حل می‌شود، نه پیش از آن). **توصیه‌ی نهایی: FP-02 مجاز به شروع است، مشروط به این‌که طراحی FP-02 صریحاً شامل تصمیم‌گیری درباره‌ی محل ذخیره‌ی رویدادهای منبع خارجی باشد (که به‌طور طبیعی R4 را نیز حل خواهد کرد).**
