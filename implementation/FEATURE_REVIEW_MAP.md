# نقشه‌ی بازبینی Feature ها (F-01 تا F-05)

> **یادداشت پاس اصلاح/Contract Resolution:** F-01/F-02/F-03 اکنون هرکدام یک `situation_key` قطعی (تابع خالص، بدون I/O) به هر کاندید `OCCURRENCE` می‌افزایند — ابعاد پایدار مطابق [[CONTRACT_RESOLUTION/R5_STABLE_SITUATION_IDENTITY_SPEC.md]]؛ منطق تصمیم Occurrence-در-برابر-Amendment هنوز پیاده نشده (موکول به FP-02). F-04 (`recordInteraction`) اکنون `core_entity_refs: []` می‌فرستد و `payload.actor_id` (نه `actor_core_entity_id`) را پر می‌کند — دیگر actor را به‌عنوان CoreEntity نیازمند نیست؛ FP-01 موضوع را از رویداد بنیان‌گذار پر می‌کند (R6). F-05 بدون تغییر. جزئیات کامل: [[remediation/WAVE_1_SURGICAL_REMEDIATION_REPORT.md]]، [[CONTRACT_RESOLUTION/WAVE_1_CONTRACT_RESOLUTION_REPORT.md]].

---

## F-01 — هوش ظرفیت (Capacity)

- مسیر پیاده‌سازی: `value-engines/capacity/capacity-detector.service.ts` + `capacity-repository.ts`
- نقطه‌ی ورود: `CapacityDetectorService.runDetectionCycle(organizationId)`
- وابستگی‌ها: `CapacityRepository` (اینترفیس + `InMemoryCapacityRepository` برای تست)، `IC13SubmissionInterface`
- قراردادهای مشترک مصرفی: `EventCandidateDTO`, `IntendedAudience`
- رابط‌های Foundation مصرفی: فقط `IC13SubmissionInterface` (تزریق‌شده، در تولید واقعی همان `eventAdmissionService`)
- دسترسی DB: **مستقیم ندارد** — فقط از طریق `CapacityRepository` تزریقی
- تولید Event Candidate: بله، `domain_tag: 'opportunity.capacity'`, `event_type: 'OCCURRENCE'`, `intended_audience: 'owner_manager'`
- منطق: `computeEmptyRatio` (تابع خالص) نسبت خالی‌بودن بیش از میانگین تاریخی را محاسبه می‌کند؛ زیر آستانه‌ی `DEFAULT_MATERIALITY_SUPPRESSION_THRESHOLD = 0.3` سکوت می‌کند (سکوت = رفتار معتبر، نه خطا). آستانه صراحتاً یک تصمیم پیاده‌سازی محلی است، نه Architecture Fact (کامنت خط ۱۰–۱۳).
- تست‌ها (۵/۵): `computeEmptyRatio` واحد؛ مسیر شاد؛ سکوت زیر آستانه؛ Idempotency دوباره‌اجرا؛ عدم وجود فیلد اقدام‌گونه در payload
- Mock/Fallback: `InMemoryCapacityRepository` فقط برای تست؛ بدون AI، بدون Fallback (PROFILE 0 خالص طبق قرارداد Feature)
- وابستگی خارجی/AI: **هیچ**

## F-02 — هوش کنسلی/عدم‌حضور (Cancellation)

- مسیر: `value-engines/cancellation/cancellation-detector.service.ts` + `cancellation-repository.ts`
- نقطه‌ی ورود: `CancellationDetectorService.runDetectionCycle(organizationId)`
- منطق: فقط واقعیت‌محور — رزروهای مجدد (`wasRebooked`) نادیده گرفته می‌شوند؛ `materiality_score` برای no-show ثابت ۰.۹ و برای cancelled ثابت ۰.۷ (مقادیر قطعی، نه یادگرفته‌شده)؛ `intended_audience: 'receptionist_coordinator'`
- ممنوعیت صریح (کامنت خط ۵–۹): هیچ مدل احتمالاتی پیش‌بینی کنسلی آینده در این فایل نیست
- تست‌ها (۳/۳): مسیر شاد (no-show رزرو‌نشده)؛ سکوت روی slot رزرو‌مجدد‌شده؛ ناوردای معماری (بدون import پیش‌بینی/ML — تست با حذف خطوط کامنت پیش از بررسی regex، طبق رفع باگ مستند در [[WAVE_1_STATUS.md]])
- وابستگی خارجی/AI: هیچ

## F-03 — هوش پیگیری (Follow-up)

- مسیر: `value-engines/followup/followup-detector.service.ts` + `followup-repository.ts`
- نقطه‌ی ورود: `FollowupDetectorService.runDetectionCycle(organizationId)`
- منطق: آستانه‌ی پیش‌فرض `DEFAULT_FOLLOWUP_THRESHOLD_DAYS = 180` روز از آخرین تعامل ثبت‌شده؛ `materiality_score = min(1, gap/(threshold*2))`
- ممنوعیت صریح دوگانه (کامنت خط ۱–۴ فایل و خط ۳۴–۳۶): این فایل هرگز نباید ماژول پیام‌رسانی/تماس (نمونه‌ی آینده‌ی notify.js/telegram.js) وارد کند؛ Payload فقط شامل `evidence_refs`/`materiality_score`/`materiality_basis`/`intended_audience` است — بدون هیچ فیلد اقدام (متن پیام، شماره تلفن، و غیره)
- تست‌ها (۴/۴): مسیر شاد؛ مرز زیر آستانه؛ **CRITICAL** بدون فیلد قابل‌اجرا در payload (بررسی دقیق مجموعه‌ی کلیدها)؛ **CRITICAL** بدون import پیام‌رسانی در کل پوشه‌ی این Feature (اسکن همه‌ی فایل‌های `.ts.` برای notify/telegram/twilio/sms/mail در خطوط import)
- وابستگی خارجی/AI: هیچ

---

## F-04 — Opportunity Feed (بازبینی ویژه)

- مسیر: `feed/opportunity-feed.service.ts`
- نقطه‌ی ورود: `OpportunityFeedService` با سه متد `getFeed` (API-01)، `getById` (API-02)، `recordInteraction` (API-03)
- وابستگی‌ها: `IC14ReadInterface` (خواندن، از FP-02 — در Wave 1 با `MockIC14ReadInterface` جایگزین شده)، `IC13SubmissionInterface` (فقط برای API-03)
- دسترسی DB: **مستقیم ندارد** — لایه‌ی نمایشی محض؛ `getFeed`/`getById` مستقیماً به `readInterface` تفویض می‌شوند بدون منطق میانی
- تولید Event Candidate: فقط در `recordInteraction` — `domain_tag: 'opportunity.interaction'`, `producer_id: 'interaction-layer:ui'`, `event_type: 'AMENDMENT'`, `core_entity_refs: [actor.actor_core_entity_id]` (خط ۴۷ — نگاه کنید [[ACTOR_COREENTITY_FINDING.md]])

### جداسازی Tenant

`MockIC14ReadInterface.getOpportunityFeed` گام اول را روی `organization_id === query.actor.organization_id` فیلتر می‌کند، **پیش از** هر فیلتر دیگر.

### فیلتر نقش (intended_audience)

گام دوم Mock: `intended_audience === 'both' || intended_audience === role`، صراحتاً **بعد از** گام سازمانی.

### ترتیب AC-2 پیش از intended_audience

تست SECURITY 3 دقیقاً همین ترتیب را با یک Opportunity متعلق به سازمان دیگر و `intended_audience: 'both'` بررسی می‌کند — انتظار: رد شدن، به‌رغم `'both'`. این تأیید می‌کند AC-2 (سازمان) هرگز توسط intended_audience دور زده نمی‌شود.

### جداسازی وضعیت actor

`myState(opportunityId, actorId)` با کلید ترکیبی `${opportunityId}:${actorId}` در `Map` ذخیره می‌شود — هیچ وضعیت سراسری روی خودِ Opportunity نیست (اصلاح فاز ۳C). تست SECURITY 4 مستقیماً دو actor را روی یک Opportunity مشترک بررسی می‌کند.

### Idempotency

`recordInteraction` دوباره فراخوانی‌شده با همان ورودی → `unique_key` یکسان → FP-01 آن را تکراری تشخیص می‌دهد، نه رویداد دوم.

### مرز Mock IC-14

`MockIC14ReadInterface` (در `test/mocks/`) به‌صراحت به‌عنوان جایگزین موقت FP-02 مستند شده (کامنت خط ۱۲–۱۷) — پیاده‌سازی واقعی، ذخیره‌شده در Postgres، باید همین اینترفیس را عیناً پیاده کند تا کد F-04 بدون تغییر باقی بماند.

### عدم وجود منطق تشخیص Opportunity

تست معماری صریح: «the Feed service source contains no domain-detection or materiality-computation logic» — بررسی می‌شود که فایل منبع F-04 هیچ محاسبه‌ی materiality یا منطق تشخیصی ندارد؛ فقط تفویض می‌کند.

### تست‌ها (۶/۶)

چهار تست امنیتی الزامی (بالا) + Idempotency + ناوردای معماری.

---

## F-05 — بریفینگ فعالانه (بازبینی ویژه)

- مسیر: `briefing/proactive-briefing.service.ts`
- نقطه‌ی ورود: `ProactiveBriefingService.getBriefing(actor)`
- وابستگی‌ها: `IC14ReadInterface` (اجباری)، `AiSummarizer` اختیاری (`{polish(text): Promise<string>}`)

### مسیر PROFILE 0

`buildProfile0Summary` یک متن قالبی قطعی از گروه‌بندی `opportunities_by_family` می‌سازد (مثلاً «۳ فرصت ظرفیت، ۲ کنسلی/عدم‌حضور در انتظار بررسی شماست.»)؛ اگر هیچ Opportunity‌ای نباشد، پیام صادقانه‌ی «در حال حاضر چیز قابل‌توجهی یافت نشد.» برمی‌گرداند — بدون تولید محتوای ساختگی.

### مسیر PROFILE 1 اختیاری

اگر `aiSummarizer` تزریق شده باشد، `polish(templateText)` فراخوانی می‌شود؛ در صورت موفقیت، `profile_used: '1'` و متن پرداخت‌شده برگردانده می‌شود.

### مدیریت شکست AI

فراخوانی `polish` در `try/catch` پیچیده شده؛ هر خطا (از جمله Timeout، Throw، Reject) به‌طور **خاموش** به همان متن PROFILE 0 برمی‌گردد — کاربر هرگز خطای لایه‌ی هوش مصنوعی را نمی‌بیند (کامنت خط ۶۴–۶۵: «MANDATORY silent fallback»).

### مرز تأمین‌کننده‌ی خارجی

`AiSummarizer` فقط یک اینترفیس است؛ **هیچ پیاده‌سازی واقعی متصل به یک ارائه‌دهنده‌ی خارجی (OpenAI/Anthropic/…) در Wave 1 وجود ندارد.** فقط در تست‌ها یک Mock تزریق می‌شود.

### داده‌ی ارسالی به AI (در صورت وجود)

در پیاده‌سازی فعلی، تنها ورودی به `polish()` متن قالبی PROFILE 0 است (خلاصه‌ی تجمیعی، نه داده‌ی خام بیمار/رویداد) — اما چون هیچ تأمین‌کننده‌ی واقعی وصل نیست، این صرفاً شکل قراردادی interface است، نه رفتار مشاهده‌شده در تولید.

### رفتار مرتبط با هزینه

بدون تأمین‌کننده‌ی واقعی، هیچ هزینه‌ی واقعی API در Wave 1 متحمل نمی‌شود؛ منطق Fallback به‌گونه‌ای طراحی شده که حتی با تأمین‌کننده‌ی واقعی، شکست (شامل شکست ناشی از محدودیت بودجه/نرخ) کاربر را متوقف نمی‌کند.

### تأیید کد/تست برای «شکست AI → خروجی قطعی مفید»

تست صریح: «MANDATORY fallback: AI summarizer failure still returns a valid PROFILE 0 briefing, never an error» — یک Mock summarizer که Throw می‌کند تزریق و بررسی می‌شود که `profile_used === '0'` و متن قالبی معتبر برگردانده شود، **بدون Exception به بیرون درز‌کرده.** این ادعا **CONFIRMED با تست خودکار واقعی**، نه فقط با خواندن کد.

### تست‌ها (۵/۵)

مسیر شاد PROFILE 0؛ صفر-Opportunity صادقانه؛ Fallback الزامی؛ مسیر موفق PROFILE 1؛ ناوردای معماری (بدون هیچ وابستگی به `IC13SubmissionInterface` — این Feature هرگز رویدادی تولید نمی‌کند).
