# گزارش — پیاده‌سازی مسیر RETRACTION برای F-02

## ۱. دستور اجراشده

`INSTRUCTION_ID: CODEX-20260904-1341-RETRACTION-F02-AUTH`، نویسنده: ممد (GLM 5.3 Flash)، `STATUS: READY_FOR_CLAUDE`.

**تایید تطبیق قبل از اجرا:** `TARGET_HANDOFF_ID` (`HANDOFF-20260904-POSTREVIEW-CLEANUP`) و `TARGET_REPORT_SHA256` (`e9aecdd41ac8bceeb702af0c802378f746c15bd695bf49c52186d2367cb0316c`) با `HANDOFF_STATE.md` وقت اجرا دقیقاً تطبیق داشتند — دستور معتبر بود.

## ۲. وضعیت نهایی

**مسیر RETRACTION برای F-02 کامل، تست‌شده، Push‌شده — دقیقاً در محدوده‌ی مجاز.**

## ۳. هدف رفتاری محقق‌شده

وقتی `CancellationRecord.wasRebooked` واقعاً از `false` به `true` تغییر می‌کند (نوبت لغوشده جایگزین شد)، اگر یک Opportunity **فعال** برای همان وضعیت وجود داشته باشد (طبق `SituationLookupInterface`)، `CancellationDetectorService` یک Candidate با `event_type: 'RETRACTION'` و `opportunity_correlation_id` هدف می‌سازد و از طریق همان مسیر همیشگی (`IC13SubmissionInterface`) ارسال می‌کند. **هیچ نوشتن مستقیمی در Projection رخ نمی‌دهد** — RETRACTION یک Event مثل هر Event دیگر است؛ قاعده‌ی از‌پیش‌موجود RETRACTION→EXPIRED در `compute-projection.ts` (CR-07 قاعده‌ی ۵) بدون هیچ تغییر، بقیه‌ی کار را انجام می‌دهد.

اگر هیچ Opportunity فعالی برای آن وضعیت وجود نداشته باشد (هرگز تشخیص داده نشده، یا از قبل بسته شده)، **هیچ‌چیز ارسال نمی‌شود** — یک نوبت جایگزین‌شده هرگز خودش یک Opportunity جدید نمی‌سازد.

## ۴. تایید پیش‌فرض‌های دستور (نه فرض، بررسی مستقیم)

- **Admission از قبل RETRACTION را می‌پذیرد** — بررسی مستقیم `admission-validator.ts` بخش (e): برای هر `event_type !== 'OCCURRENCE'`، هدف باید به یک OCCURRENCE بنیان‌گذار هم‌سازمان و هم‌خانواده Resolve شود. بدون هیچ تغییر، این قانون برای RETRACTION هم دقیقاً همان‌طور که برای AMENDMENT کار می‌کند، کار می‌کند.
- **Projection از قبل قانون RETRACTION→EXPIRED را دارد** — بررسی مستقیم `compute-projection.ts`: `retraction` پیدا می‌شود، `latestEventId` را به خودش تنظیم می‌کند، `state` را بدون قید‌وشرط `EXPIRED` می‌کند. بدون هیچ تغییر.
- **ساختار Payload برای RETRACTION** — بررسی مستقیم `candidate-structural-validator.ts`: برای خانواده‌های تشخیص (غیر از `opportunity.interaction`)، شکل Payload مستقل از `event_type` یکسان است (`evidence_refs`, `materiality_score`, `materiality_basis`, `intended_audience` الزامی) — پس RETRACTION هم باید همان شکل کامل را حمل کند (نه یک Payload خالی/متفاوت).

هیچ‌کدام از این سه فرض دستور نیاز به تغییر معماری یا CCR نداشت — همه‌شان از قبل درست کار می‌کردند.

## ۵. فایل‌های تغییریافته (چک‌سام SHA-256)

| فایل | نوع تغییر | چک‌سام SHA-256 |
|---|---|---|
| `implementation/value-engines/cancellation/cancellation-detector.service.ts` | افزودن منطق تشخیص Rebook + ساخت/ارسال Candidate نوع RETRACTION | `89d16c5c7ace82b6e560b79d5c8c228e6c26784cad9b2de89adb55fb31c115a8` |
| `implementation/test/value-engines/cancellation/cancellation-detector.spec.ts` | ۴ تست جدید (بخش ۶ همین گزارش) | `32ad4e0cd16ec2a2b0ebe5cda59a314ea72b60944077619a228db2420e48b379` |

**هیچ فایل دیگری تغییر نکرد.**

## ۶. اثبات Drift صفر دو فایل منجمد (قبل/بعد یکسان)

```
shared-contracts/types.ts : 35d218065f9829f2d9c258d082ba6a2fd48588c573a44f722d35fad6dcb76296
prisma/schema.prisma      : 84d138c2222647521f981afefc69944b87b6d2b091cc0f3747e2d0599f37eff0
```

هر دو چک‌سام دقیقاً همان مقداری است که در تمام گزارش‌های قبلی (از FP-02 Core تا بازبینی مستقل ممد) ثبت شده — **صفر Drift، از ابتدای این خط کاری تا امروز.**

## ۷. سناریوهای تست (۴ تست جدید، همگی روی Postgres واقعی، دقیقاً مطابق بند ۴ دستور)

1. **rebook واقعی → RETRACTION → Projection → `state:'EXPIRED'`** با `latestEventId` = دقیقاً همان رویداد RETRACTION (نه رویداد بنیان‌گذار). تایید شد فقط یک OCCURRENCE و یک RETRACTION برای همان Appointment وجود دارد.
2. **بعد از RETRACTION، تشخیص مجدد همان appointmentId** (مثلاً نوبت جایگزین هم بعداً کنسل شد) → یک OCCURRENCE کاملاً مستقل جدید، **نه AMENDMENT، نه ادغام** — تایید شد Lookup برای وضعیت قبلی `EXPIRED` گزارش می‌دهد و صفر AMENDMENT برای آن تولید می‌شود.
3. **rebook بدون Opportunity فعال منطبق** (هرگز تشخیص داده نشده) → هیچ Candidate ارسال نمی‌شود، صفر رکورد در `event_log`.
4. **ناوردای معماری موجود (Fail-closed):** یک RETRACTION مستقیم با `opportunity_correlation_id` نامعتبر → توسط Admission رد می‌شود با `OPPORTUNITY_CORRELATION_ID_INVALID` — این رفتار از قبل وجود داشت؛ تست فقط اثبات کرد پیاده‌سازی جدید آن را دور نمی‌زند.

مسیر بدون Rebook (رفتار قبلی F-02) — صفر Regression؛ هر ۷ تست قبلی بدون تغییر رفتاری سبز ماندند.

## ۸. اجرای کامل مجموعه‌ی تست + تایپ‌چک

```
npx tsc --noEmit -p tsconfig.json   → تمیز، بدون خطا
npx jest --maxWorkers=1
Test Suites: 13 passed, 13 total
Tests:       126 passed, 126 total
```

(۱۲۲ تست قبلی + ۴ تست جدید — یک اجرا، بدون Retry، روی Postgres واقعی. `jest.config.js` دست‌نخورده.)

## ۹. رعایت محدودیت‌های اجباری دستور

- **`shared-contracts/types.ts` و `prisma/schema.prisma`:** لمس نشدند — هیچ فیلد قراردادی جدیدی لازم نشد، پس CCR لازم نبود.
- **بدون Import بین‌Featureای، بدون دسترسی Prisma خارج از `foundation/`، بدون نوشتن در `event_log` خارج از FP-01.**
- **F-01/F-03:** دست‌نخورده ماندند — هیچ منطق RETRACTION به آن‌ها اضافه نشد.
- **`SituationLookupInterface`:** بدون تغییر — همچنان Advisory-only.
- **R5-Concurrency:** بدون تغییر — عمداً باز مانده.

## ۱۰. Push با شاهد Commit Hash واقعی (الگوی دو-Commit، طبق دستور بند ۷.۵)

**Commit اول (محتوای واقعی — کد + تست):**
```
Commit hash: 30d7a4ebf0b773a6a7edf3798e61cdadb0e98d56
Branch:      main
Remote:      https://github.com/aminansaricom-bot/mlino_3-sep.git
Push result: 30868f7..30d7a4e  main -> main
فایل‌های تغییریافته: implementation/value-engines/cancellation/cancellation-detector.service.ts، implementation/test/value-engines/cancellation/cancellation-detector.spec.ts
```

**Commit دوم (همین گزارش + `HANDOFF_STATE.md`):** چون این گزارش خودش بخشی از آن Commit است، Hash دقیق آن فقط *بعد* از انجام واقعی Commit قابل‌دانستن است — در پاسخ نهایی به کاربر، با تایید مستقل `git ls-remote`، گزارش می‌شود (نه در این فایل).

## ۱۱. اقدام بعدی

**متوقف می‌شوم** — طبق شرط توقف صریح دستور (بند ۹). بازبینی مستقل این فاز را ممد جداگانه انجام خواهد داد.
