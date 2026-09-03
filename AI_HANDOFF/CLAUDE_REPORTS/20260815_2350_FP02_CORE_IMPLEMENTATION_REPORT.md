# گزارش تحویل Claude — FP-02 Core Implementation

## شناسه‌ی فاز/مأموریت

`FP02_CORE_IMPLEMENTATION` (اجراشده طبق دستور معتبر Codex: `CODEX-20260815-2323-FP02CORE`، محدوده‌ی مجوز: `IMPLEMENT_FP02_CORE_PROJECTION_AND_IC14_ONLY`)

## تاریخ و زمان

۲۰۲۶-۰۸-۱۵، تکمیل حدود ساعت ۲۳:۵۰ (زمان جلسه) — با ادامه در جلسه‌ی ۲۰۲۶-۰۸-۲۰ برای تکمیل تحویل نهایی (ZIP و ثبت Handoff).

## وضعیت نهایی

**FP-02 CORE IMPLEMENTATION — READY FOR CENTRAL CODE REVIEW**

## هدف انجام‌شده

پیاده‌سازی کامل دو بخش مجاز این فاز، هر دو با تست واقعی روی Postgres واقعی (نه Mock):

1. **FP-02 Core Opportunity Projection** — بازسازی رویداد-محور جداول `opportunity_current_state`/`opportunity_interaction_state` از `event_log`، مطابق قوانین CR-07 (جداسازی زنجیره‌ی کسب‌وکار/تعامل، `as_of_time` صریح، بدون ادغام برای `situation_key` مشترک طبق CR-03).
2. **پیاده‌سازی واقعی IC-14** (`OpportunityReadService`) با توالی هفت‌مرحله‌ای الزامی (AC-2 → intended_audience → actor-state → group/sort) و `AC2DecisionPort` دقیقاً مطابق شکل نهایی‌شده‌ی فاز ۵B.3، با اجرای مرکزی fail-closed.

جزئیات کامل تطبیق قانون-به-قانون در `implementation/FP02_CONTRACT_COMPLIANCE_REPORT.md` داخل ZIP آمده است — این گزارش صرفاً خلاصه می‌کند، نه جایگزین آن سند می‌شود.

## منابع و Baseline های استفاده‌شده

- `PHASE_5B1_FP02_DESIGN_REMEDIATION/05_PROJECTION/FP02_EVENT_SOURCED_PROJECTION_RULES.md` (CR-07)
- `PHASE_5B2_FINAL_SECURITY_CLOSURE/FP02_AC2_AND_EVIDENCE_DELIVERY_CONTRACT.md`
- `PHASE_5B3_AC2_PORT_SHAPE_CORRECTION/AC2_DECISION_PORT_FINAL_DELTA.md`
- `implementation/shared-contracts/types.ts`، `implementation/prisma/schema.prisma`، `implementation/test/mocks/mock-ic14-read-interface.ts`، `implementation/test/feed/opportunity-feed.spec.ts`، `implementation/foundation/event-admission/admission-validator.ts`، `implementation/foundation/event-log/event-log.service.ts` — همگی فقط خوانده شدند، هیچ‌کدام تغییر نکردند.

## فایل‌های ایجادشده

**۵ فایل تولیدی:**
- `implementation/foundation/access-decision/ac2-decision-port.ts`
- `implementation/foundation/opportunity-projection/compute-projection.ts`
- `implementation/foundation/opportunity-projection/rebuild-projection.service.ts`
- `implementation/foundation/opportunity-read/access-candidate.ts`
- `implementation/foundation/opportunity-read/opportunity-read.service.ts`

**۳ فایل تست:**
- `implementation/test/mocks/fake-ac2-decision-port.ts`
- `implementation/test/foundation/opportunity-projection/rebuild-projection.spec.ts` (۱۲ تست)
- `implementation/test/foundation/opportunity-read/opportunity-read.spec.ts` (۱۸ تست)

**۶ سند تحویل** (داخل `implementation/`): `FP02_IMPLEMENTATION_STATUS.md`, `FP02_VALIDATION_RESULTS.md`, `FP02_CONTRACT_COMPLIANCE_REPORT.md`, `FP02_SECURITY_EVIDENCE.md`, `FP02_CHANGED_FILES.md`, `FP02_CHECKSUM_MANIFEST.txt`.

چک‌سام SHA-256 کامل هر ۸ فایل کد در `implementation/FP02_CHECKSUM_MANIFEST.txt` و `implementation/FP02_CHANGED_FILES.md` ثبت شده است.

## فایل‌های تغییرکرده

**هیچ‌کدام.** هیچ فایل تولیدی از پیش‌موجود (FP-01، FP-03، F-01 تا F-05، `shared-contracts/types.ts`، `prisma/schema.prisma`، `test/mocks/mock-ic14-read-interface.ts`، `test/feed/opportunity-feed.spec.ts`) ویرایش نشد — فقط برای مرجع خوانده شدند.

## فایل‌های حذف‌شده

هیچ.

## کد تولیدی تغییر کرده است؟

**بله — اما فقط به‌صورت افزودن فایل جدید در محدوده‌ی مجاز.** هیچ فایل تولیدی موجود در خارج از فهرست بالا لمس نشد.

## معماری منجمد / قرارداد مشترک تغییر کرده‌اند؟

**خیر، هیچ‌کدام.** `shared-contracts/types.ts` و `prisma/schema.prisma` صفر تغییر دارند — چک‌سام SHA-256 هر دو در `FP02_CHANGED_FILES.md` برای اثبات Drift صفر ثبت شده است. `AC2DecisionPort` یک قرارداد implementation-level است، نه بخشی از Shared Contract منجمد.

## Migration ها / وابستگی‌ها

هیچ Migration جدیدی اضافه نشد. هیچ وابستگی (Dependency) جدیدی — چه تولیدی چه توسعه‌ای — به `package.json` اضافه نشد.

## آزمون‌های اجراشده و نتایج دقیق

```
npx tsc --noEmit -p tsconfig.json     → خروج ۰، بدون خطا
npx prisma validate                    → "The schema at prisma\schema.prisma is valid"
npx jest --maxWorkers=1                → Test Suites: 12 passed, 12 total
                                          Tests:       105 passed, 105 total
                                          (۷۵ تست از پیش‌موجود بدون تغییر رفتار + ۳۰ تست جدید)
```

بررسی‌های معماری تکمیلی (همگی موفق): بدون واردات بین‌ویژگی‌ای غیرمجاز (Feed/Value-Engines/Briefing → فایل‌های داخلی FP-02)؛ بدون دسترسی مستقیم Prisma خارج از `foundation/`؛ `event_log` فقط از یک نویسنده (`event-log.service.ts`) نوشته می‌شود؛ صفر تغییر در `shared-contracts/types.ts` و `prisma/schema.prisma`. جزئیات کامل در `implementation/FP02_VALIDATION_RESULTS.md`.

هیچ تست ناپایدار (Flaky) مشاهده یا Retry نشد — تمام نتایج از یک اجرای واحد است.

## تصمیم‌های گرفته‌شده و سطح اختیار هر تصمیم

| تصمیم | سطح اختیار |
|---|---|
| راهبرد بازسازی تراکنشی حذف-و-درج‌مجدد، محدود به هر سازمان | IMPLEMENTATION DESIGN — طبق سند مرجع فاز ۵B.1 (مقیاس V1 کلینیک، بدون زیرساخت جدید) |
| حل فیلد `event_time` در DTO با خواندن مستقیم `eventTime` واقعی از `event_log` (نه `lastComputedAt`) بدون تغییر Schema | تصمیم طراحی خودتشخیصی در سطح IMPLEMENTATION — چون قابل‌حل بدون تغییر Schema بود، به CCR نرسید |
| نگارش Fake تست‌محور برای `AC2DecisionPort` بدون هیچ منطق Governance واقعی | مطابق محدوده‌ی صریح دستور (بدون Adapter واقعی) |
| بازتایید ۴ تست SECURITY موجود F-04 در یک Suite تست جدید و جداگانه، بدون لمس فایل تست Mock موجود | مطابق الزام صریح بند ۹ دستور |

**هیچ تصمیمی در سطح FROZEN ARCHITECTURE گرفته یا تغییر داده نشد؛ صفر CCR و صفر ACR این فاز.**

## یافته‌های باز

هیچ یافته‌ی جدیدی این فاز باز نشد. یافته‌های از پیش‌موجود بدون تغییر: R4 (OPEN)، R5-Concurrency (OPEN — دو OCCURRENCE مستقل با `situation_key` مشترک هنوز می‌توانند دو Opportunity مستقل تولید کنند؛ این رفتار عمداً حفظ و با تست تایید شد، نه حل شد)، اکثر سلول‌های AMENDMENT/RETRACTION در `LIFECYCLE_AUTHORITY_MATRIX.md` (GAP).

## CCR های باز

بدون تغییر از فاز قبل. این فاز CCR جدیدی ایجاد نکرد.

## ACR های باز

**۰.**

## ریسک‌ها و محدودیت‌ها

- R5-Concurrency هم‌چنان حل‌نشده است — در مقیاس بالا یا هم‌زمانی واقعی می‌تواند به Opportunityهای تکراری منجر شود؛ این یک محدودیت شناخته‌شده و پذیرفته‌شده است، نه یک باگ.
- `AC2DecisionPort` هنوز به هیچ Governance واقعی متصل نیست — فقط Fake تست موجود است؛ تا اتصال واقعی، هر استفاده‌ی تولیدی از `OpportunityReadService` نیازمند یک Adapter واقعی خواهد بود.
- محدودیت‌های معنایی از پیش‌ثبت‌شده در Shared Contract (`EvidenceRef` بدون تضمین Resolve، `situation_key` بدون تضمین Uniqueness) بدون تغییر باقی ماندند و در کد جدید به‌صراحت رعایت/مستندسازی شدند.

## وضعیت دروازه‌ی فاز بعدی

طبق دستور مجوز، این فاز صرفاً Core Projection و IC-14 را پیاده‌سازی کرد. `SituationLookupInterface`، اتصال Governance واقعی، و حل R5-Concurrency هم‌چنان خارج از دامنه و برای تصمیم صریح Codex در دستور بعدی باز هستند.

## اقدام پیشنهادی بعدی

منتظر بازبینی مستقل Codex روی ZIP بازبینی این فاز. بر اساس نتیجه‌ی بازبینی، دستور بعدی می‌تواند شامل: تصحیح (در صورت یافتن مغایرت)، یا تایید نهایی و صدور مجوز برای گام بعد (مثلاً `SituationLookupInterface` یا حل رسمی R5-Concurrency) باشد.

## مسیر ZIP

`C:\mlino code\MLINO_FP02_CORE_IMPLEMENTATION_REVIEW_PACK.zip`

## اندازه‌ی ZIP

۲۱۷٬۰۱۸ بایت

## SHA-256 فایل ZIP

`2E07C42F8BDB6839FA5B1B6FA5DF77FEC10AEA2DDD20829373A5AAA55D0A4FE1`

## مسیر Manifest داخلی

`implementation/FP02_CHECKSUM_MANIFEST.txt` (داخل ZIP) — چک‌سام SHA-256 هر ۸ فایل کد جدید + چک‌سام مرجع دو فایل منجمد برای اثبات Drift صفر.

## فهرست اسناد مهم داخل ZIP

`implementation/FP02_IMPLEMENTATION_STATUS.md` (خلاصه وضعیت)، `implementation/FP02_VALIDATION_RESULTS.md` (نتایج کامل Validation)، `implementation/FP02_CONTRACT_COMPLIANCE_REPORT.md` (تطبیق قانون-به-قانون با قرارداد)، `implementation/FP02_SECURITY_EVIDENCE.md` (شواهد امنیتی fail-closed/عدم‌نشت/انزوا)، `implementation/FP02_CHANGED_FILES.md` (فهرست کامل فایل‌ها + چک‌سام)، به‌علاوه‌ی کد منبع کامل و تمام تست‌ها (۱۲ Suite، ۱۰۵ تست).
