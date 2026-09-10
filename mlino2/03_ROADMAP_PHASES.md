# MLINO V2 — نقشه‌ی راه پیشنهادی (فازبندی)

این فازبندی مستقیماً از توضیح مالک محصول استخراج شده — ترتیب پیشنهادی است، نه یک تعهد زمانی (طبق انضباط کل پروژه، هیچ تخمین زمانی ساختگی داده نمی‌شود).

## وضعیت هم‌ترازی Knowledge Loop

OD-30 در [KNOWLEDGE_LOOP_ALIGNMENT.md](HANDOFF/20260910_V2_REVIEW/KNOWLEDGE_LOOP_ALIGNMENT.md) بسته شد. Reality، Knowledge و Learning به‌عنوان لایه‌ها/فرآیندهای مفهومی روی Event، Projection، Business Context، Facts، Observations، Signals، Decisions، Recommendations، Actions، Outcomes و Evaluations موجود تعریف شده‌اند؛ موجودیت، schema یا API جدیدی لازم نیست. این تصمیم برنامهٔ اجرایی Stage 3 را جلو نمی‌اندازد و learning پایدار، outcome measurement، telemetry و reverse data flow همچنان نیازمند تصمیم جدا هستند.

## وضعیت طراحی Experience Orchestration

طراحی [EXPERIENCE_ORCHESTRATION_DESIGN.md](HANDOFF/20260910_V2_REVIEW/EXPERIENCE_ORCHESTRATION_DESIGN.md) آمادهٔ product review است. تصمیم متمرکز [ASSISTANT_OWNERSHIP_DECISION.md](HANDOFF/20260910_V2_REVIEW/ASSISTANT_OWNERSHIP_DECISION.md) گزینهٔ A را پیشنهاد می‌کند: Assistant در Core و providerهای محدود در Modules. این milestone چرخهٔ Experience، نقش Assistant، مرز MLINO Core و Modules و وابستگی‌های AR/Virtual Storefront را تعریف می‌کند؛ implementation، schema، API و activation هیچ‌کدام شروع نشده‌اند. تا پذیرش محصول، scope معتبر همان Intent-Guided Local Discovery محلی و تک‌نشسته است.

## وضعیت جاری پس از نهایی‌سازی Experience Matching

چهار شرط EM-G1 تا EM-G4 در `HANDOFF/20260910_V2_REVIEW/EXPERIENCE_MATCHING_FINALIZATION.md` پاسخ داده و در طراحی اصلی اعمال شده‌اند. تجربهٔ اولیه Intent-Guided Local Discovery با صفر تا سه نتیجهٔ کسب‌وکار، یک جایگاه برای هر کسب‌وکار و اقدام `Open business details` است. context ranking مستقل، offer-driven relevance، Guided Shopping، تعامل مستقیم و AR جدید در این slice وجود ندارند. آفر فقط enhancement یک تجربهٔ از قبل معتبر است؛ درخواست صریح کاربر برای offer/discount/promotion به شرط eligibility تبدیل می‌شود و آفر هرگز ranking یا trigger تبلیغاتی نیست. هر نتیجه باید از یک option/product/service واحد بیاید و evidence چند محصول با هم ترکیب نمی‌شود.

ترتیب بعدی Stage 3:

1. بازبینی closure و تطبیق Design، Finalization و Intent Contract.
2. پذیرش رسمی scope محدود، claim/evidence matrix و مثال‌های single-option توسط مالک محصول.
3. دستور جداگانه برای پیاده‌سازی؛ این سند یا Gate قبلی به‌تنهایی مجوز کدنویسی نیست.
4. پس از پیاده‌سازی، conformance و runtime delivery gate مستقل.

## سابقهٔ وضعیت پس از Gate معماری Experience Matching

مرجع نتیجه `HANDOFF/20260910_V2_REVIEW/EXPERIENCE_MATCHING_FINAL_GATE_REVIEW.md` است: **B — تأیید با اصلاحات جزئی**. بازبینی معماری انجام شده؛ closure پیش از پیاده‌سازی هنوز کامل نیست.

1. EM-G1: هم‌راستاسازی ranking با قرارداد Intent؛ context بدون اولویت صریح کاربر عامل مستقل نمی‌شود.
2. EM-G2: حفظ اختیاری یا اجباری بودن آفر/قیمت مطابق revision تأییدشده.
3. EM-G3: تعریف صریح اختیار Active، resume و پایان قطعی در مرز Experience.
4. EM-G4: انتخاب mode محدود، claim/evidence matrix، رفتار unknown و حدود اقدام و توضیح؛ سپس مثال‌های conformance.
5. بازبینی closure و دستور جداگانهٔ مالک محصول پیش از هر کدنویسی.

این توالی جایگزین برنامهٔ «در انتظار Gate» زیر است؛ متن قبلی برای تاریخچه حفظ شده است. Gate جدید دامنهٔ Intent را گسترش نمی‌دهد.

## سابقهٔ نقشهٔ راه پیش از Gate — Stage 3 Intent Layer

قرارداد مفهومی Intent برای دامنهٔ محدود Stage 3 از Gate نهایی با وضعیت B عبور کرده و موارد جزئی آن در `HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_FINALIZATION.md` بسته شده‌اند. مرجع جاری `HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md` است. اسناد قدیمی‌تر Decisions و Data Contract به‌عنوان تاریخچه باقی می‌مانند و در تعارض‌های مشخص‌شده مرجع اجرایی نیستند.

دامنهٔ فعلی فقط محیط محلی، یک task در یک نشست foreground، دادهٔ آزمایشی/mock و context دستی است. سقف نشست ۳۰ دقیقه بی‌فعالیتی و ۲ ساعت مطلق است؛ یک clarification برای هر درخواست مجاز است؛ رد آن سکوت را در همان task الزام می‌کند؛ و بازگشت tab/app هیچ Intent signal یا شروع خودکاری ایجاد نمی‌کند.

طراحی پیشنهادی این لایه در `HANDOFF/20260910_V2_REVIEW/EXPERIENCE_MATCHING_DESIGN.md` ثبت شده است. milestone فعال اکنون بازبینی محصول و معماری این طراحی است؛ هیچ پیاده‌سازی آغاز نشده است.

ترتیب بعدی Stage 3:

1. Gate طراحی Experience Matching: تعریف Experience، eligibility، relevance ordering، explanation، privacy و مرز نفوذ کسب‌وکار.
2. تصمیم محصول دربارهٔ mode اولیه: Discovery همراه offer awareness مرتبط، با تصمیم جدا برای هر Guided Shopping محدود.
3. تأیید evidence matrix دادهٔ آزمایشی و رفتار supported، unsupported، unknown و no-match.
4. تصمیم و Gate جدا پیش از هر پیاده‌سازی، schema/API، اتصال عملیاتی V1 یا توسعهٔ storefront.

Stage 3 هنوز مجوز پیاده‌سازی ندارد. production scale، حافظهٔ بلندمدت، استنتاج میان نشست‌ها، GPS/passive context، external AI، telemetry/outcome writeback و live V1 integration تصمیم‌های آینده‌اند. مرحله نباید با اعلان، رتبه‌بندی پنهان، پروفایل حساس یا تکرار منطق business intelligence در V2 پیش برود.

## فاز ۱ — پایه: نقشه + پروفایل کسب‌وکار (بدون AI پیچیده، بدون AR)

- مدل داده‌ی «پروفایل کسب‌وکار» طبق `02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md`، با داده‌ی آزمایشی (Mock).
- نمایش کسب‌وکارها و محصولاتشان روی نقشه.
- بدون هوش مصنوعی پیچیده هنوز — همین قدم اول ثابت می‌کند مدل داده و نقشه درست کار می‌کنند.
- دامنه‌ی کسب‌وکاری اولیه: همان‌هایی که V1 هم با آن‌ها شروع کرده (کلینیک‌های زیبایی/دندان‌پزشکی) — هم‌راستایی با V1، نه واگرایی.

## فاز ۲ — دستیار هوشمند تطبیق نیاز

- چت با دستیار AI.
- فهم نیت مشتری و جست‌وجوی معنایی بین محصولات/خدمات کسب‌وکارهای اطراف (فیلتر جغرافیایی + شباهت معنایی).
- نمایش نتیجه روی نقشه.
- گسترش دامنه‌ی کسب‌وکاری به فروشگاه‌ها/کافه‌ها/رستوران‌ها (هم‌زمان با فاز ۲ V1).

## فاز ۳ — ویترین مجازی (AR)

- فعال‌سازی دوربین، تشخیص جهت‌گیری کاربر.
- پرسیدن طبقه از کاربر در مکان‌های چندطبقه.
- Overlay محصولات/آفرهای هر کسب‌وکار روی تصویر واقعی دوربین.
- این پیچیده‌ترین فاز فنی است — باید بعد از اثبات فاز ۱ و ۲ شروع شود، نه هم‌زمان با آن‌ها.

## اصل کلی فازبندی

هر فاز باید **قابل‌نمایش و تست‌پذیر مستقل** باشد — دقیقاً مثل انضباط V1 (هر Feature با تست واقعی تحویل داده می‌شود، نه صرفاً طراحی). موجی نباید فاز ۳ (AR) را قبل از تکمیل و تثبیت فاز ۱ شروع کند، مگر با تایید صریح مالک محصول.

## یادداشت تطبیق با مسیر جدید V2

فازهای قدیمی «دستیار تطبیق نیاز» و «ویترین مجازی» هنوز زمینهٔ محصولی هستند، اما milestone فعال باید ابتدا Intent Layer را روشن و ارزیابی کند. AR و Virtual Storefront پس از تأیید intent، قرارداد داده، ownership و evidence ادامه پیدا می‌کنند؛ این بازچینی به معنی شروع هیچ‌کدام نیست.
