# MLINO BOOK — وضعیت V2

این فایل حافظهٔ محصولی V2 است و جایگزین قراردادهای V1 یا اسناد `AI_HANDOFF/` نیست.

## وضعیت محصول

MLINO V2 لایهٔ هوشمند تجربهٔ دنیای واقعی است؛ نیت کاربر اولویت دارد و ارزش از تجربهٔ مفید می‌آید، نه از وقفهٔ تبلیغاتی. مرحلهٔ اول استرا در `4bbc88c` بازبینی مستقل PASS داشت و تم، فضای من و انتخاب شخصی را پوشش می‌دهد.

مرحلهٔ دوم بر مبنای `4bbc88c` پیاده‌سازی، اعتبارسنجی و تحویل شده است: کشف پیشنهاد نزدیک، اعتبار `valid_from`، اشتراک‌گذاری متنی و حالت خالی صادقانه. commit تحویل `3784e4f61c8d273355ce19bb8bcaddef4e23ba97` روی شاخهٔ استرا و Remote تأیید شده است.

## هم‌ترازی حلقهٔ Reality → Knowledge → Learning (OD-30)

سند [KNOWLEDGE_LOOP_ALIGNMENT.md](HANDOFF/20260910_V2_REVIEW/KNOWLEDGE_LOOP_ALIGNMENT.md) واژه‌های Reality، Knowledge و Learning را به‌عنوان لایه/فرآیند مفهومی نگه می‌دارد، نه موجودیت جدید. Reality دنیای عملیاتی خارج از MLINO است که از طریق Observation/Event گزارش می‌شود؛ Knowledge فهم حاکم‌شده و قابل‌ردیابی حاصل Event Log و Projectionهای موجود است؛ Learning فرآیند governed برای مقایسهٔ Outcome/Evaluation و بهبود مشتق‌هاست. هیچ Reality/Knowledge/Learning entity، schema، API یا مخزن موازی ایجاد نمی‌شود.

در مرز V1/V2، V1 و منبع کسب‌وکار مالک Business Context، facts، capability، knowledge و evidence هستند و V2 آن‌ها را برای Intent و Experience به‌صورت read-only مصرف می‌کند. Signal، Recommendation، Action و Outcome جایگزین یکدیگر نیستند؛ کلیک، اشتراک‌گذاری، بازشدن جزئیات یا proximity به‌تنهایی Outcome یا Learning معتبر نیست. OD-30 بسته شد، اما قرارداد outcome، consent/retention و learning آینده همچنان در Open Decisions باقی است.

## طراحی لایهٔ Experience Orchestration

سند [EXPERIENCE_ORCHESTRATION_DESIGN.md](HANDOFF/20260910_V2_REVIEW/EXPERIENCE_ORCHESTRATION_DESIGN.md) ادامهٔ طراحی V2 را ثبت می‌کند و برای تأیید محصول آماده است. Orchestration فقط پس از Intent تأییدشده، context مجاز، capability/evidence واجد شرایط و eligibility، mode تجربه و اقدام بعدی را هماهنگ می‌کند؛ Intent، facts یا outcome جدیدی تولید نمی‌کند.

چرخهٔ پیشنهادی Experience شامل Discovering، Asking، Matching، Presenting، Comparing، Acting، Completed، Abandoned و Expired است؛ slice اولیه فقط از حالت‌های لازم برای Local Discovery استفاده می‌کند و Comparing نیازمند تصمیم بعدی است. سند [ASSISTANT_OWNERSHIP_DECISION.md](HANDOFF/20260910_V2_REVIEW/ASSISTANT_OWNERSHIP_DECISION.md) گزینهٔ A را پیشنهاد می‌کند: Assistant متعلق به Core است و Modules providerهای محدود capability هستند. Assistant یک لایهٔ هماهنگ‌کنندهٔ persistent در محدودهٔ نشست است، نه chatbot مستقل، profiler یا مالک منطق کسب‌وکار. Core قواعد مشترک Intent، privacy، lifecycle، evidence و handoff را نگه می‌دارد و Modules منطق و دادهٔ دامنهٔ خود را مالک‌اند.

AR و Virtual Storefront تا زمان وجود projection معتبر V1→V2، applicability در سطح option، قرارداد action، spatial/privacy governance و ارزیابی مستقل فعال نمی‌شوند. این طراحی هنوز مجوز پیاده‌سازی نیست و منتظر product approval است.

مرز حافظهٔ Assistant در [ASSISTANT_MEMORY_BOUNDARY_DECISION.md](HANDOFF/20260910_V2_REVIEW/ASSISTANT_MEMORY_BOUNDARY_DECISION.md) گزینهٔ A است: فقط working context همان task و نشست مجاز نگه داشته می‌شود. User preference memory نیازمند save/consent/edit/delete و تصمیم مستقل آینده است؛ Business Context و Knowledge حافظهٔ Assistant نیستند و مالکیت آن‌ها با V1/منبع کسب‌وکار می‌ماند؛ full conversational history خارج از scope است.

## مرز فعلی

دادهٔ نمایشی شامل ۱۰ رکورد است و اتصال عملیاتی V1↔V2 وجود ندارد. موجودی، reviews، شبکهٔ اجتماعی، گفت‌وگوی کسب‌وکار، telemetry، deep link و تبدیل خرید ساخته نشده‌اند. قراردادهای V1، Backend و مرزهای منجمد دست‌نخورده‌اند.

## سابقهٔ وضعیت پیش از Gate معماری Experience Matching

مرحلهٔ سوم هنوز پیاده‌سازی نشده است. مرجع جاری و حاکم Intent Layer، `HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md` است؛ نتیجهٔ Gate نهایی در `INTENT_CONTEXT_FINAL_GATE_REVIEW.md` وضعیت B، یعنی «تأیید با تغییرات جزئی»، را ثبت کرد و `INTENT_CONTEXT_FINALIZATION.md` بسته‌شدن همان موارد را مستند می‌کند. اسناد `INTENT_CONTEXT_DECISIONS.md` و `INTENT_CONTEXT_DATA_CONTRACT.md` برای تاریخچه حفظ شده‌اند، اما هر فرض ناسازگار آن‌ها دربارهٔ Strength، تأیید نسخه، consent، lifecycle، retention یا outcome با Redesign جایگزین شده است.

دامنهٔ تصویب‌شده فقط محیط محلی، یک task در یک نشست foreground و دادهٔ آزمایشی/mock است. پردازش محلی باید انتخاب صریح کاربر داشته باشد؛ Intent ماندگار نمی‌شود؛ بازگشت از background یا hidden به‌تنهایی سیگنال Intent یا مجوز ادامهٔ matching نیست؛ سقف نشست ۳۰ دقیقه بی‌فعالیتی و ۲ ساعت مطلق است؛ و پس از رد یا بستن clarification پرسش تکرار نمی‌شود. مقیاس production، حافظهٔ بلندمدت کاربر، استنتاج رفتاری میان نشست‌ها، GPS/passive context، اتصال زندهٔ V1 و پردازش بیرونی تصویب نشده‌اند.

طراحی پیشنهادی Experience Matching در `HANDOFF/20260910_V2_REVIEW/EXPERIENCE_MATCHING_DESIGN.md` ثبت شده و منتظر بازبینی محصول و معماری است. این طراحی Experience را یک فرصت محدود، قابل توضیح و متصل به Intent تأییدشده و capability دارای evidence تعریف می‌کند. eligibility پیش از ordering اعمال می‌شود: constraint سخت یا evidence ناشناخته با امتیاز، فاصله، آفر یا پرداخت کسب‌وکار جبران نمی‌شود. ترتیب پیشنهادی پس از eligibility از preferenceهای صریح و مرتب‌شدهٔ کاربر، context مجاز، فاصله و شناسهٔ پایدار برای tie استفاده می‌کند.

این بسته مجوز کدنویسی، schema، API، اتصال V1 یا تغییر ranking موجود نیست. گام بعدی Gate مستقل همین طراحی و تصمیم دربارهٔ mode اولیه، evidence آزمایشی قابل اتکا و حداقل explanation است. توسعهٔ live V1، storefront، تعامل مستقیم، AR، telemetry و سنجش conversion همچنان به قرارداد و governance جدا نیاز دارد.

## سابقهٔ نتیجهٔ Gate معماری Experience Matching

بازبینی سه سند Intent Redesign، Finalization و Experience Matching در `HANDOFF/20260910_V2_REVIEW/EXPERIENCE_MATCHING_FINAL_GATE_REVIEW.md` نتیجهٔ **B — تأیید با اصلاحات جزئی** را ثبت کرد. این گزارش self-review کدکس است؛ بازبینی مستقل بیرونی یا تأیید runtime نیست. بخش بالا سابقهٔ پیشنهاد پیش از Gate است؛ وضعیت جاری همین بخش است.

اصول مالکیت کاربر، eligibility پیش از ranking، مسئولیت V1 برای حقیقت کسب‌وکار و مسئولیت V2 برای relevance تأیید شدند. چهار شرط پیش از کدنویسی باز است: EM-G1 حذف عامل مستقل context-fit از ترتیب‌دهی و هم‌راستایی با preferenceهای تأییدشده؛ EM-G2 حفظ تفاوت آفر اختیاری و شرط اجباری؛ EM-G3 تصریح Active/Paused و پایان قطعی در مرز تجربه؛ EM-G4 انتخاب mode اولیه و ثبت ماتریس شواهد، حدود ادعاها و مثال‌های ارزیابی.

آفر ثبت‌شده برای یک کسب‌وکار به‌تنهایی اثبات تخفیف برای محصول مشخص نیست. پرداخت نیز با ثابت‌ماندن facts و evidence نباید انتخاب، تعداد فرصت ترجیحی، ترتیب یا زمان ارائه را تغییر دهد. ارزش کسب‌وکار از پاسخ‌دادن به نیاز مرتبط حاصل می‌شود؛ conversion یا درآمد هنوز اثبات نشده است.

گام بعد فقط بستن EM-G1 تا EM-G4 در مستندات و بازبینی closure است. اجرای Stage 3 همچنان به دستور جدا نیاز دارد. دامنهٔ محلی، یک نشست و دادهٔ آزمایشی و قرارداد حاکم Intent بدون تغییر باقی مانده‌اند.

## وضعیت جاری پس از نهایی‌سازی Experience Matching

چهار شرط Gate در `HANDOFF/20260910_V2_REVIEW/EXPERIENCE_MATCHING_FINALIZATION.md` بسته و در `EXPERIENCE_MATCHING_DESIGN.md` اعمال شده‌اند. context فقط شرط یا preference صریحِ داخل revision تأییدشده است و عامل ranking مستقل نیست. در slice اولیه، درخواست صریح آفر/تخفیف/promotion شرط eligibility است و آفر اتفاقی فقط enhancement تجربهٔ معتبر است؛ هیچ آفر بدون capability و evidence مرتبط relevance یا ranking نمی‌سازد.

تجربهٔ اولیه «Intent-Guided Local Discovery» است: صفر تا سه نتیجهٔ کسب‌وکار، حداکثر یک جایگاه برای هر کسب‌وکار، با دلیل تطبیق، حدود evidence و اقدام `Open business details`. برای این slice، آفر هرگز relevance، رتبه، اعلان یا مسیر تبلیغاتی ایجاد نمی‌کند و فقط enhancement یک تجربهٔ از قبل معتبر است. اگر کاربر صریحاً آفر، تخفیف یا promotion بخواهد، این درخواست requirement و شرط eligibility است؛ در غیر این صورت آفر business-level فقط با scope روشن قابل نمایش است و بدون شواهد applicability نباید تخفیف محصول مشخص معرفی شود.

هر نتیجهٔ کسب‌وکار باید بر یک option، product یا service واحد بنا شود که همهٔ شرط‌های لازم کاربر را برآورده کند. ترکیب evidence محصول A و محصول B یک match معتبر نیست. facts و evidence را V1/Directory مالک است؛ V2 آن‌ها را از گزینه‌های مختلف ادغام نمی‌کند. مقایسهٔ چند گزینه فقط با مبنای هم‌معنا، واحد و currency مشترک و preference تأییدشده مجاز است؛ وگرنه ادعای «ارزان‌تر/بهتر» ساخته نمی‌شود.

Guided Shopping، تعامل مستقیم، storefront غنی و AR جدید در این slice نیستند.

Active، Paused، Rejected، Expired و Ended در مرز Experience تفکیک شده‌اند؛ visibility ادامهٔ matching نیست و حالت terminal قابل resume نیست. وضعیت طراحی برای closure review آماده است. کدنویسی فقط پس از پذیرش همین closure و دستور جداگانهٔ مالک محصول مجاز می‌شود.
