INSTRUCTION_ID: CODEX-20260904-1341-RETRACTION-F02-AUTH
AUTHOR: CODEX
STATUS: READY_FOR_CLAUDE
TARGET_HANDOFF_ID: HANDOFF-20260904-POSTREVIEW-CLEANUP
TARGET_REPORT_PATH: C:\mlino code\AI_HANDOFF\CLAUDE_REPORTS\20260904_POST_REVIEW_FOLLOWUP_CLEANUP.md
TARGET_REPORT_SHA256: e9aecdd41ac8bceeb702af0c802378f746c15bd695bf49c52186d2367cb0316c
TARGET_ZIP_PATH: (none)
TARGET_ZIP_SHA256: (n/a)
REVIEW_COMPLETED_AT: 2026-09-04T13:41:00
AUTHORIZATION_SCOPE: IMPLEMENT_F02_RETRACTION_PATH_ONLY_NO_OTHER_GAPS

---

# مجوز فاز بعد: پیاده‌سازی مسیر RETRACTION برای F-02

**صادرکننده:** ممد (بازبین مستقل، GLM 5.3 Flash) — **بر پایه‌ی تصمیم صریح مالک محصول** (۴ سپتامبر ۲۰۲۶) از میان گزینه‌های: RETRACTION F-02 / هاردنینگ F-1 / Adapter واقعی AC-2 / R5-Concurrency.

## ۱. پیش‌زمینه و مجوز

- چرخه‌ی بازبینی مستقل پنج تحویل (`CODEX-20260904-1246-FIVEDELIVERY-FULLLINE-REVIEW`) بسته و تایید شد؛ پاک‌سازی تکمیلی (`HANDOFF-20260904-POSTREVIEW-CLEANUP`) نیز توسط بازبین راستی‌آزمایی شد.
- مالک محصول، فاز بعد را **مسیر RETRACTION برای F-02** انتخاب کرد.
- این Gap قبلاً در گزارش‌های ۲۰۲۶۰۹۰۳ و ۲۰۲۶۰۹۰۴ صادقانه باز مانده بود و در بازبینی مستقل ممد نیز به‌عنوان Gap باز (نه حل‌شده) ثبت شد: «مسیر RETRACTION (مثلاً وقتی یک نوبت لغوشده‌ی F-02 بالاخره جایگزین می‌شود) هنوز پیاده‌سازی نشده».

## ۲. محدوده‌ی مجاز (AUTHORIZATION_SCOPE: IMPLEMENT_F02_RETRACTION_PATH_ONLY)

1. **هدف رفتاری:** وقتی `CancellationRecord.wasRebooked` از false به true تغییر کند (نوبت کنسل‌شده جایگزین شد)، آن Opportunity دیگر یک فرصت باز نیست و باید به‌طور قطعی بسته شود.
2. **مسیر معماری مجاز:** طبق ADR-00AC و چرخه‌ی حیات مصوب (`NEW→SEEN→ACKNOWLEDGED|DISMISSED→EXPIRED` + Amendment/Retraction فقط از طریق Event)، RETRACTION یک **Event** است — نه حذف/آپدیت مستقیم Projection. یونس باید:
   - در F-02 (`value-engines/cancellation/cancellation-detector.service.ts`) منطق تشخیص rebook (تغییر `wasRebooked`) اضافه کند؛
   - در صورت rebook، یک Candidate با `event_type: 'RETRACTION'` و `opportunity_correlation_id` هدف (از طریق همان `SituationLookupInterface` — الگوی موجود) بسازد؛
   - مطمئن شود Admission (`admission-validator.ts`) RETRACTION را می‌پذیرد (امروز می‌پذیرد — هدف آن OCCURRENCE بنیان‌گذار هم‌خانواده است)؛
   - و Projection (`compute-projection.ts` — قانون RETRACTION→EXPIRED از قبل وجود دارد) بدون تغییر این Event را به EXPIRED منعکس کند.
3. **محدودیت معنایی الزامی:** طبق `R5_STABLE_SITUATION_IDENTITY_SPEC.md §F-02`، rebook «AMENDMENT/Retraction طبیعی» همان `situation_key` است — این رفتار عیناً حفظ شود. بعد از RETRACTION، اگر همان `appointmentId` دوباره پردازش شود، Lookup باید `found:true/state:'EXPIRED'` بدهد و هر Candidate بعدی OCCURRENCE مستقل باشد (طبق CR-03 هرگز ادغام نشود).
4. **فقط F-02.** هیچ منطق RETRACTION برای F-01/F-03 اضافه نشود (آن‌ها `expires_at` دارند / پایان هویتی متفاوت — خارج از دامنه‌ی این فاز). تصمیم آینده در این باره با مالک محصول است.

## ۳. ممنوعیت‌های همیشگی

- `shared-contracts/types.ts` و `prisma/schema.prisma`: ممنوع مطلق مگر با CCR رسمی. اگر RETRACTION به فیلد قراردادی جدیدی نیاز داشت که DTO فعلی ندارد، **CCR بنویس و متوقف شو — پچ خاموش ممنوع**.
- هیچ Import بین‌Featureای، هیچ دسترسی Prisma خارج از `foundation/`، هیچ نوشتنی در `event_log` جز از مسیر FP-01 (`event-log.service.ts`).
- `SituationLookupInterface` همچنان Advisory-only می‌ماند — R5-Concurrency عمداً باز می‌ماند و در این فاز حل نمی‌شود.
- `jest.config.js` (شامل `maxWorkers: 1`) دست نخورد.

## ۴. تست الزامی (تعریف Done)

1. **تست‌های جدید روی Postgres واقعی** (نه Mock) — حداقل این سناریوها:
   - rebook واقعی → RETRACTION ثبت می‌شود → Projection → `state: 'EXPIRED'` با `latestEventId` = رویداد RETRACTION.
   - بعد از RETRACTION، تشخیص مجدد همان `appointmentId` → OCCURRENCE مستقل جدید (نه AMENDMENT، نه ادغام).
   - RETRACTION بدون `opportunity_correlation_id` معتبر → توسط Admission رد می‌شود (رفتار fail-closed موجود).
   - مسیر no-rebook (رفتار فعلی F-02) — رگرسیون صفر.
2. **کل `npm test`** پس از تغییرات: همه‌ی ۱۲۲ تست قبلی بدون Regression + تست‌های جدید — روی Postgres واقعی، یک اجرا، بدون Retry.
3. `npx tsc --noEmit` تمیز.
4. تست آینه‌ای F-01/F-03 لازم نیست (دست نکورده‌اند) اما اجرای کل مجموعه اجباری است تا صفر Regression اثبات شود.

## ۵. تحویل و گزارش

1. فهرست کامل فایل‌های تغییر/ایجاد + چک‌سام SHA-256 هرکدام در گزارش بیاور.
2. اثبات Drift صفر دو فایل منجمد (چک‌سام قبل/بعد) در گزارش ثبت شود.
3. اگر وسط کار به تناقض با سطوح ۱ تا ۵ اقتدار رسیدی: متوقف شو، CCR/ACR بنویس، با کاربر هماهنگ کن — حدس نزن.
4. گزارش کامل طبق فرمت همیشگی در `AI_HANDOFF/CLAUDE_REPORTS/` با `HANDOFF_ID` جدید، کپی در `CLAUDE_LATEST_REPORT.md`، به‌روزرسانی `HANDOFF_STATE.md`، و سپس **Push با شاهد Commit Hash واقعی در پاسخ نهایی به کاربر** (نه داخل گزارش — یک گزارش نمی‌تواند Hash خودش را از پیش بداند؛ الگوی دو-Commit قبلی پذیرفتنی است).
5. **شرط توقف:** بعد از گزارش + Push، کاملاً متوقف شو — بازبینی مستقل این فاز را بازبین (ممد) جداگانه انجام می‌دهد.

---
*بازبین: ممد (GLM 5.3 Flash) — این مجوز بر اساس انتخاب صریح مالک محصول در ۲۰۲۶-۰۹-۰۴ صادر شد. R4 (BLOCKED)، Adapter واقعی AC-2، و R5-Concurrency همچنان خارج از دامنه و منتظر تصمیم مالک‌اند.*
