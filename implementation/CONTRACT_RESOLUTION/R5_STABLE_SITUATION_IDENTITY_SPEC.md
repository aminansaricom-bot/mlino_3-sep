# مشخصات هویت پایدار «وضعیت کسب‌وکار» (R5)

**اصل تصویب‌شده:** وضعیت کسب‌وکار یکسان + تحلیل تغییریافته → AMENDMENT. وضعیت متفاوت → OCCURRENCE جدید. هویت وضعیت **مالکیت Producer/Value-Engine محلی** است، نه یک موجودیت Kernel-level.

**دامنه‌ی این پاس:** طبق دستور صریح (بند ۴۰: «فقط برای Featureهایی که مشخصات هویتشان کاملاً پشتیبانی می‌شود پیاده‌سازی کن»)، این سند فقط **محاسبه‌ی قطعی `situation_key`** را برای هر Feature مشخص می‌کند و آن را به قرارداد و ماندگاری اضافه می‌کند. **منطق تصمیم OCCURRENCE-در-برابر-AMENDMENT (که نیازمند دانستن وضعیت ACTIVE/EXPIRED یک Opportunity است) عمداً به FP-02 موکول شده** — پیاده‌سازی آن بدون Projection واقعی معادل ساختن یک موتور Dedup پنهان خواهد بود، که صریحاً ممنوع است (بند ۱۶، ۳). جزئیات در [[../remediation/OPPORTUNITY_BUSINESS_SITUATION_IDENTITY_REVIEW.md]] (بازبینی قبلی) هم‌چنان معتبر است؛ این سند فقط بخش «قابل‌حل‌شدن اکنون» را می‌بندد.

---

## F-01 — هوش ظرفیت (Capacity)

- **تعریف وضعیت کسب‌وکار:** «ظرفیت این منبع/کلینیک در این تاریخ به‌طور غیرمنتظره خالی است.»
- **ابعاد پایدار:** `organization_id`، `entityRef` (منبع/کلینیک)، `date` (تاریخ کسب‌وکار).
- **ابعاد فرار (عمداً حذف‌شده):** `totalMinutes`، `historicalAverageBookedMinutes`، `materiality_score` (محاسبه‌شده، همیشه در حال تغییر با هر اجرای مجدد).
- **ورودی متعارف (Canonical Identity Input):** `{producer_id: 'value-engine:capacity', organization_id, entityRef, date}`.
- **قاعده‌ی متعارف‌سازی:** رشته‌ی ترکیبی `capacity:${organization_id}:${entityRef}:${date}` (بدون هش — همه‌ی اجزا از قبل رشته‌های پایدار و بدون کاراکتر `:` هستند؛ در صورت وجود `:` در شناسه‌ها، باید escape شود — طبق شواهد فعلی داده، این مورد پیش نمی‌آید).
- **قاعده‌ی هش/کدگذاری:** لازم نیست — رشته‌ی متعارف خودش کوتاه و یکتا کافی است.
- **مثال وضعیت یکسان:** دو اجرای متوالی چرخه‌ی تشخیص روی همان `(org-1, resource-A, 2026-08-20)` — حتی اگر `historicalAverageBookedMinutes` بین دو اجرا به‌روزرسانی شده باشد — همان `situation_key`.
- **مثال وضعیت متفاوت:** همان `resource-A` در `2026-08-21` (تاریخ متفاوت) → `situation_key` متفاوت. `resource-B` در همان تاریخ → `situation_key` متفاوت.
- **رفتار Occurrence:** اولین باری که یک `situation_key` دیده می‌شود (طبق منطق آینده‌ی FP-02).
- **رفتار Amendment:** دیدن مجدد `situation_key` موجود با تحلیل تغییریافته (طبق منطق آینده‌ی FP-02).
- **داده‌ی منبع موجود:** `WorkingHoursSlot{eventId, organizationId, entityRef, date, totalMinutes, historicalAverageBookedMinutes}` (`value-engines/capacity/capacity-repository.ts`) — همه‌ی ابعاد پایدار از قبل در دسترس‌اند.
- **مرجع قرارداد:** Feature Contract F-01 بند ۲۱: «Idempotency: unique_key = capacity + شناسه‌ی بازه‌ی زمانی/کلینیک + هش محتوا» — عبارت «شناسه‌ی بازه‌ی زمانی/کلینیک» دقیقاً با `{entityRef, date}` مطابقت دارد.
- **ابهامات باقی‌مانده (مستند، نه حل‌شده):** رابط فعلی Repository (`getBookedMinutesForDate`) فقط یک عدد تجمیعی به‌ازای هر `(resource, date)` برمی‌گرداند — یعنی مدل داده‌ی فعلی **نمی‌تواند** بیش از یک «وضعیت ظرفیت» مستقل برای یک منبع در یک روز نمایش دهد (مثلاً شیفت صبح/عصر مجزا). اگر یکپارچگی واقعی Malino چنین دانه‌بندی‌ای را افشا کند، این مشخصات باید **پیش از آن** به‌روزرسانی شود — این یک محدودیت داده‌ی فعلی است، نه یک تصمیم طراحی این سند.

## F-02 — هوش کنسلی/عدم‌حضور (Cancellation)

- **تعریف وضعیت کسب‌وکار:** «این نوبت خاص کنسل/عدم‌حضور شد و جایگزین نشد.»
- **ابعاد پایدار:** `organization_id`، `appointmentId`.
- **ابعاد فرار (عمداً حذف‌شده):** `wasRebooked` (دقیقاً همان چیزی که ممکن است بین دو اجرا تغییر کند)، `occurredAt` (توصیفی)، `kind` (کنسل‌شدن/عدم‌حضور خودش یک طبقه‌بندی واقعیتی از همان رویداد است، نه بعد هویتی مجزا — یک appointment نمی‌تواند هم کنسل‌شده هم عدم‌حضور باشد).
- **ورودی متعارف:** `{producer_id: 'value-engine:cancellation', organization_id, appointmentId}`.
- **قاعده‌ی متعارف‌سازی:** `cancellation:${organization_id}:${appointmentId}`.
- **مثال وضعیت یکسان:** همان `appointmentId` دوباره پردازش شود (مثلاً تغییر `wasRebooked` از false به true بین دو اجرا) → همان `situation_key`؛ این AMENDMENT/Retraction طبیعی است (نوبت جایگزین شد → دیگر یک فرصت نیست).
- **مثال وضعیت متفاوت:** `appointmentId` دیگری برای همان بیمار → `situation_key` متفاوت (طبق بند ۱۳ دستور: نباید فقط به‌خاطر بیمار/تاریخ مشترک، وضعیت‌ها یکی فرض شوند).
- **داده‌ی منبع موجود:** `CancellationRecord{eventId, organizationId, entityRef, appointmentId, kind, occurredAt, wasRebooked}` (`value-engines/cancellation/cancellation-repository.ts`).
- **مرجع قرارداد:** Feature Contract F-02 بند ۲۱: «Idempotency: unique_key = cancellation + شناسه‌ی نوبت + هش محتوا» — «شناسه‌ی نوبت» = `appointmentId`، مستقیماً.
- **ابهامات باقی‌مانده:** هیچ — این ساده‌ترین و کامل‌ترین موردی است که داده‌اش موجود است.

## F-03 — هوش پیگیری (Follow-up)

- **تعریف وضعیت کسب‌وکار:** «این بیمار از تاریخ آخرین تعامل ثبت‌شده‌اش بیش از آستانه فاصله گرفته است.»
- **ابعاد پایدار:** `organization_id`، `patientEntityRef`، `lastInteractionAt` («بازه‌ی زمانی» — لنگرگاه شروع دوره‌ی فعلی عدم‌تعامل).
- **ابعاد فرار (عمداً حذف‌شده):** `gap`/`materiality_score` محاسبه‌شده (هر روز بزرگ‌تر می‌شود، تابعی از «اکنون»، نه بخشی از هویت).
- **ورودی متعارف:** `{producer_id: 'value-engine:followup', organization_id, patientEntityRef, lastInteractionAt}`.
- **قاعده‌ی متعارف‌سازی:** `followup:${organization_id}:${patientEntityRef}:${lastInteractionAt}`.
- **چرا `lastInteractionAt` جزو هویت است (نه فرار):** برخلاف `materiality_score`، این یک لنگرگاه واقعیتی است — تا وقتی بیمار یک تعامل *جدید* ثبت نکند، `lastInteractionAt` تغییر نمی‌کند؛ بنابراین این دوره‌ی مشخص از عدم‌تعامل را به‌طور پایدار شناسایی می‌کند. وقتی بیمار سرانجام تعامل جدیدی داشته باشد، `lastInteractionAt` تغییر می‌کند و به‌درستی یک **وضعیت جدید و مستقل** (دوره‌ی بعدی احتمالی عدم‌تعامل، در آینده) را نشانه می‌گذارد — نه ادامه‌ی همان وضعیت قبلی.
- **مثال وضعیت یکسان:** دو اجرای متوالی روی همان بیمار با همان `lastInteractionAt` (بیمار هنوز تعامل جدیدی نداشته) → همان `situation_key`، حتی اگر تعداد روزهای فاصله (و بنابراین `materiality_score`) بین دو اجرا بزرگ‌تر شده باشد.
- **مثال وضعیت متفاوت:** بیمار یک تعامل جدید ثبت می‌کند (`lastInteractionAt` به‌روز می‌شود)، سپس دوباره از آستانه عبور می‌کند → `situation_key` جدید (دوره‌ی متفاوت).
- **داده‌ی منبع موجود:** `PatientInteractionRecord{eventId, organizationId, patientEntityRef, lastInteractionAt}` (`value-engines/followup/followup-repository.ts`) — هر دو بعد پایدار از قبل در دسترس‌اند.
- **مرجع قرارداد:** Feature Contract F-03 بند ۲۱: «Idempotency: unique_key = followup + شناسه‌ی بیمار + بازه‌ی زمانی + هش محتوا» — «بازه‌ی زمانی» دقیقاً با `lastInteractionAt` مطابقت دارد؛ این سند اولین جایی است که این عبارت رسماً به یک فیلد داده‌ی واقعی نگاشت شده است.
- **ابهامات باقی‌مانده:** هیچ — برخلاف حدس اولیه‌ی این تحلیل (که ابتدا این Feature را BLOCKED در نظر گرفت)، بند ۲۱ خودِ Feature Contract سرنخ دقیق را می‌داد؛ خواندن دقیق سند، نیاز به CONTRACT_CHANGE_REQUEST را برای این Feature منتفی کرد.

---

## شکل پیاده‌سازی

فیلد اختیاری جدید `situation_key?: string` روی `EventCandidateDTO` (فقط برای `event_type: 'OCCURRENCE'` روی خانواده‌های تشخیص — `opportunity.capacity`/`cancellation`/`followup`؛ بدون معنا برای `opportunity.interaction`). هر Value Engine این را قطعی و بدون I/O اضافه محاسبه می‌کند (تابع خالص، تست‌پذیر مستقل).

## چرا منطق OCCURRENCE/AMENDMENT اینجا پیاده‌سازی نشد

تصمیم «آیا Opportunity موجودی برای این `situation_key` هنوز باز است؟» نیازمند دانستن وضعیت `ACTIVE`/`EXPIRED` است — دقیقاً همان چیزی که FP-02 (Projection) قرار است محاسبه کند. پیاده‌سازی این تصمیم بدون FP-02 واقعی یعنی یا (الف) ساختن یک نسخه‌ی موازی و ناقص از منطق FP-02 در هر Value Engine (نقض صریح بند ۱۶: «موتور Dedup مرکزی نساز»)، یا (ب) حدس زدن معنای «باز» بدون منبع مرجع. طبق بند ۴۰، این پاس فقط تا جایی پیش رفت که «مشخصات هویت کاملاً پشتیبانی می‌شود» — یعنی خودِ `situation_key`، نه زنجیره‌ی تصمیم کامل چرخه‌ی حیات.
