# گزارش بازبینی مستقل — ممد (GLM/Muse Spark) — ۲۰۲۶-۰۹-۰۴

**نقش:** بازبین مستقل (جانشین Codex/ممد قبلی — بر اساس تصمیم صریح و مستقیم کاربر، مالک محصول)
**دامنه:** پنج تحویل پیاپی بدون بازبینی مستقل، طبق توصیه‌ی خود `HANDOFF_STATE.md` بازبینی یکجا:

1. `HANDOFF-20260815-2350-FP02CORE` — FP-02 Core Implementation
2. `HANDOFF-20260903-SELFREVIEW-FP02` — خودارزیابی + یک رفع باگ دفاعی
3. `HANDOFF-20260903-SITUATIONLOOKUP` — پیاده‌سازی SituationLookupInterface
4. `HANDOFF-20260903-F01-LOOKUP-WIRING` — اتصال F-01 به Lookup
5. `HANDOFF-20260904-F02F03-LOOKUP-WIRING` — اتصال F-02/F-03 به Lookup

**تعارض منافع:** صفر — تمام کد بازبینی‌شده توسط یونس (Claude) تولید شده؛ من مدل دیگری هستم و در تولید این کد هیچ نقشی نداشتم.

---

## بخش ۱ — شواهد راستی‌آزمایی‌شده‌ی مستقیم (نه اتکا به گزارش‌ها)

| # | ادعا در گزارش‌ها | راستی‌آزمایی مستقل من | نتیجه |
|---|---|---|---|
| ۱ | Drift صفر در `shared-contracts/types.ts` | محاسبه‌ی مستقیم SHA-256: `35d218065f9829f2d9c258d082ba6a2fd48588c573a44f722d35fad6dcb76296` | ✅ منطبق با Manifest |
| ۲ | Drift صفر در `prisma/schema.prisma` | محاسبه‌ی مستقیم SHA-256: `84d138c2222647521f981afefc69944b87b6d2b091cc0f3747e2d0599f37eff0` | ✅ منطبق با Manifest |
| ۳ | ۱۲۲/۱۲۲ تست روی Postgres واقعی | اجرای مستقل `npm test` توسط خودم (کانتینر `mlino-v1-local-db` روی ۵۴۳۵، Up) | ✅ **13 Suites / 122 Tests passed** در ۱۶ ثانیه، یک اجرا، بدون Retry |
| ۴ | صفر Import بین‌Featureای | grep روی `value-engines/`، `feed/`، `briefing/` | ✅ صفر مورد |
| ۵ | Prisma فقط در `foundation/` | grep کل `implementation/` | ✅ تولیدی: فقط foundation؛ تست‌ها فقط wrapper خود foundation را Import می‌کنند |
| ۶ | `event_log` فقط یک نویسنده | grep همه‌ی `eventLog.create/update/...` | ✅ تنها `event-log.service.ts:54`؛ سایر موارد فقط `deleteMany` پاک‌سازی در تست‌ها |
| ۷ | چک‌سام ۷ فایل تغییریافته‌ی ادعاشده در گزارش‌های ۲۰۲۶۰۹۰۳/۲۰۲۶۰۹۰۴ | محاسبه‌ی مستقیم هر ۷ فایل | ✅ هر ۷ مورد دقیقاً منطبق |

**نکته‌ی جزئی:** خودارزیابی ۲۰۲۶۰۹۰۳ چک‌سام schema را «84d13822...» نقل کرده بود — یک غلط تایپی در نقل‌قول بود؛ Manifest رسمی (`FP02_CHECKSUM_MANIFEST.txt`) مقدار درست `84d138c2...` را دارد و با واقعیت فایل منطبق است. هیچ Drift واقعی وجود ندارد.

## بخش ۲ — بازخوانی خصمانه‌ی کد امنیتی

### ۲.۱ `evaluateAC2FailClosed` (ac2-decision-port.ts)
- ماتریس fail-closed کامل: Port throw → deny همه؛ خروجی غیرآرایه → deny همه؛ کاندیدای گم‌شده → deny؛ `access !== 'allow'` → deny؛ کاندیدای بدون `subject_core_entity_refs` → deny **بدون** فراخوانی Port.
- رفع خودارزیابی (گارد `Array.isArray` خط ۱۱۲) حاضر و درست است.
- فیلتر Intersection (خط ۱۱۳) تزریق Evidence بیگانه را مسدود می‌کند. ✅

### ۲.۲ `OpportunityReadService` (opportunity-read.service.ts)
- توالی هفت‌مرحله‌ای IC-14 رعایت: خواندن tenant-scoped → AC-2 → حذف deny → audience → actor-state → group/sort.
- سیاست S2: در `toDTO` فقط `decision.authorized_evidence_refs` افشا می‌شود، هرگز `row.evidenceRefs` خام (خط ۱۸۷). ✅
- `getOpportunityById`: عدم افتراق «وجود ندارد» از «سازمان دیگر» (پرهیز از Existence Oracle). ✅

### ۲.۳ `SituationLookupService`
- فقط Query؛ هرگز `submitEventCandidate` صدا نمی‌زند؛ هرگز `event_log`/Projection را نمی‌نویسد. ✅
- رفع‌ابهام چند-مورد قطعی (جدیدترین `event_time`، tie-break با id) و فقط به‌عنوان Advise — نه ادغام، نه ادعای حل R5. ✅
- `found:false` درست وقتی Projection هنوز بازسازی نشده (گزارش وضعیت Projection، نه event_log خام). ✅

### ۲.۴ Projection (compute-projection.ts / rebuild-projection.service.ts)
- محاسبات خالص، بدون ساعت پنهان (`as_of_time` صریح)، ترتیب قطعی (`eventTime` + tie-break id). ✅
- CR-03 (عدم ادغام): گروه‌بندی فقط بر اساس founding OCCURRENCE، هرگز `situation_key`. ✅
- RETRACTION → EXPIRED و `latestEventId`. ✅
- بازسازی: حذف-و-درج‌مجدد در یک تراکنش، محدود به سازمان؛ تنها نویسنده‌ی جداول Projection. ✅
- حلقه‌ی `amendsEventId`: Admission (اصلاحیه R3) تضمین می‌کند هر AMENDMENT/RETRACTION به بنیان‌گذار هم‌خانواده اشاره کند و `event-log.service.ts:65` آن را از `opportunity_correlation_id` تنظیم می‌کند — شاخه‌ی «بی‌صدا»ی `partitionChains` عملاً دست‌نیافتنی است (دفاع در عمق). ✅

## بخش ۳ — یافته‌های این بازبینی (غیرمسدودکننده)

**F-1 (LOW — هاردنینگ آینده):** در `evaluateAC2FailClosed`، اگر Port دو تصمیم با `opportunity_correlation_id` تکراری برگرداند، رفتار فعلی «آخری‌برنده» در Map است؛ همچنین اگر کاندیداهای ورودی id تکراری داشته باشند، در Map نتیجه تداخل می‌کنند. این شکاف امنیتی نیست (Port مرجع تصمیم مجاز است؛ fail-closed در برابر *خطا* است نه بدخواهیِ یک Port مجاز)، اما یک قاعده‌ی قطعی (مثلاً رد تکراری‌ها) در پاس آینده شایان توجه است. توصیه: در اولین پاس کاری بعدی به‌عنوان هاردنینگ کم‌ریسک.

**F-2 (INFO — ظاهری):** `rebuild-projection.service.ts:102` از placeholder `['__none__']` استفاده می‌کند؛ `in: []` در Prisma هم هیچ ردیفی را حذف نمی‌کرد و ردیف Interaction بدون founding ممکن نیست — عملکرد درست است، فقط کمی non-idiomatic.

**F-3 (شناخته‌شده — بدون تغییر):** R4 (Evidence Integrity) BLOCKED؛ R5-Concurrency OPEN (Lookup فقط Advisory است و باید بماند)؛ Adapter واقعی Governance برای AC-2 وجود ندارد (تا اتصال واقعی، هر استفاده‌ی تولیدی از `OpportunityReadService` نیازمند Adapter واقعی است). هر سه در گزارش‌ها صادقانه ثبت شده‌اند — من تایید می‌کنم که هیچ‌کدام به‌اشتباه «حل‌شده» جا نخورده‌اند.

**F-4 (پروتکل — رفع‌شده با همین گزارش):** پنج تحویل بدون بازبینی مستقل انباشته شده بود. چهار پاس ۲۰۲۶۰۹۰۳/۲۰۲۶۰۹۰۴ با اختیار مستقیم کاربر و **بدون چرخه‌ی رسمی Codex/ممد** انجام شدند — این انحراف پروتکل در خود گزارش‌ها صادقانه ثبت شده بود (پنهان نشده بود)، اما اکنون با همین بازبینی مستقل تا حد ممکن جبران می‌شود.

**F-5 (سند — برای یونس):** `MUSE_SPARK_DEVELOPER_ONBOARDING.md` §۳ کهنه است (۱۰۵/۱۰۵ و انتظار بازبینی؛ واقعیت: ۱۲۲/۱۲۲ و پنج تحویل). همچنین نام نقش بازبین پس از تصمیم اخیر کاربر تغییر کرده. توصیه: به‌روزرسانی سند توسط یونس.

## بخش ۴ — جمع‌بندی

**verdict: تایید فنی — بدون عیب مسدودکننده.**

هر پنج تحویل، از نظر قرارداد منجمد (Drift صفر اثبات‌شده با چک‌سام مستقیم)، قوانین سخت مهندسی (هر شش مورد با grep/اجرای مستقیم)، صحت امنیتی fail-closed (بازخوانی خصمانه)، و سلامت رفتاری (۱۲۲/۱۲۲ روی Postgres واقعی، اجرای مستقل خودم) سالم‌اند. یافته‌های F-1 و F-2 غیرمسدودکننده و کم‌اهمیت‌اند و نباید مانع حرکت بعدی شوند.

گپ‌های باز (R4، R5-Concurrency، Adapter واقعی AC-2، مسیر RETRACTION برای F-02) عمداً باز مانده‌اند و کماکان به تصمیم صریح مالک محصول نیاز دارند.

---
*بازبین: ممد (مدل GLM در نقش Muse Spark) — این گزارش از تولید هیچ کدی که بازبینی کرده‌ام مستقل است.*
