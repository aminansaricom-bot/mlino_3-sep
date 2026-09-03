# CONTRACT_CHANGE_REQUEST — مکانیزم تشخیص مجدد وضعیت کسب‌وکار (R5)

**وضعیت: درخواست. تصویب یا اعمال نشده. تحلیل کامل در [[../OPPORTUNITY_BUSINESS_SITUATION_IDENTITY_REVIEW.md]].**

## قرارداد فعلی

`PHASE_4B_DISTRIBUTED_IMPLEMENTATION_PLAN/03_FEATURE_PACKAGES/F-01/CONTRACTS.md:9` قصد را بیان می‌کند («تشخیص تکراری = AMENDMENT با correlation id موجود») بدون تعریف مکانیزم Lookup. Feature Contract های F-01/F-02/F-03 (`PHASE_4A_IMPLEMENTATION_DESIGN/06_FEATURE_CONTRACTS/`) هیچ‌کدام این مکانیزم را مشخص نمی‌کنند.

## مسئله

بدون یک کلید طبیعی مستقل («هویت وضعیت کسب‌وکار» — مثلاً `{resourceRef, date}` برای Capacity)، هیچ Value Engine راهی برای یافتن `opportunity_correlation_id` موجود ندارد تا AMENDMENT درست را تولید کند؛ در نتیجه هر اجرای مجدد با Payload کمی متفاوت، یک Occurrence بنیان‌گذار **جدید و مستقل** می‌سازد. تأیید‌شده در Wave 1: `capacity-detector.service.ts` همیشه `OCCURRENCE` تولید می‌کند، بدون شرط.

## پیشنهاد حداقلی

هر Feature Contract (F-01/F-02/F-03) باید یک کلید طبیعی صریح برای «وضعیت کسب‌وکار» تعریف کند، و Repository اختصاصی همان Value Engine (نه یک سرویس Kernel-level جدید) مسئول نگه‌داشتن نگاشت `کلید طبیعی → آخرین opportunity_correlation_id شناخته‌شده` می‌شود:

- F-01 (Capacity): کلید طبیعی پیشنهادی `{resourceRef, date}`.
- F-02 (Cancellation): کلید طبیعی پیشنهادی `{appointmentId}`.
- F-03 (Follow-up): کلید طبیعی پیشنهادی `{patientEntityRef}`.

هر Value Engine پیش از تولید کاندید، این نگاشت را می‌خواند؛ اگر یک Correlation ID فعال موجود باشد، `AMENDMENT` با آن id تولید می‌کند؛ در غیر این صورت `OCCURRENCE` جدید. **این یک موتور Dedup مرکزی جدید نیست** — کاملاً درون مرز موجود هر Value Engine می‌ماند (مشابه الگوی موجود `CancellationRepository.getUnprocessedCancellations`).

## چرا سطح معماری منجمد (Kernel/ADR/IC) لازم نیست

این تصمیم فقط به این مربوط است که «تولیدکننده چگونه داده‌ی خودش را پیگیری می‌کند» — چیزی که از قبل هر Value Engine مسئولش است (هر کدام Repository اختصاصی خودش را دارد). هیچ Core Entity جدید، هیچ Capability جدید، هیچ خانواده‌ی Event جدید، و هیچ تغییری در `opportunity_correlation_id`/`unique_key` (که تعریفشان طبق ADR-00AC درست و کافی است) لازم نیست.

## Feature های متأثر

F-01، F-02، F-03 — هر سه Feature Contract باید کلید طبیعی خودشان را رسمی کنند.

## اثر سازگاری

Additive — افزودن یک متد Lookup اختیاری به هر Repository؛ بدون تغییر در `EventCandidateDTO` یا `RejectionReasonCode`.

## اثر Migration

بسته به تصمیم پیاده‌سازی — می‌تواند یک جدول کوچک Producer-owned باشد (نه بخشی از Event Log/Kernel schema)، یا از داده‌ی منبع موجود (مثلاً `appointmentId`) مستقیماً استنتاج شود. جزئیات به فاز طراحی بعدی موکول است.

## اثر تست

نیازمند تست‌های تشخیص‌مجدد به‌ازای هر Value Engine («اجرای دوم با Payload متفاوت روی همان وضعیت → AMENDMENT، نه Occurrence جدید»).

## اثر امنیتی

خنثی — این یک بهبود صحت کسب‌وکار (جلوگیری از تکثیر نامعتبر Opportunityها) است، نه یک مرز امنیتی.

## چرا در این اصلاح پیاده‌سازی نشد

دستور صریح این تکلیف (بند ۱۴-۱۶): «این آیتم اساساً یک تکلیف شفاف‌سازی است. آن را در کد حل نکن... این فاز اختراع موتور Dedup Opportunity را مجاز نمی‌کند.» طبق تحلیل در [[../OPPORTUNITY_BUSINESS_SITUATION_IDENTITY_REVIEW.md]]، نتیجه CONTRACT_CHANGE_REQUEST REQUIRED است، نه IMPLEMENTATION FIX AUTHORIZED — بنابراین این سند تولید شد و کدی نوشته نشد.
