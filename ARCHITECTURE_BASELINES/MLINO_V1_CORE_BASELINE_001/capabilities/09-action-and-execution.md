# Capability Specification — Action & Execution

## Status
Frozen v1.0

---

## Purpose

اجرای اقدام مجاز روی دنیای بیرون، با ارجاع اجباری به تصمیم (AC-4) و مالکیت انحصاری تصمیم ریسک نوشتن (بخش ۱۴).

---

## Responsibilities

- حمل `decision_id` قابل‌ردیابی به یک مصنوع Decision/Recommendation موجود (AC-4).
- Idempotency اجرا با کلید یکتاسازی ترکیبی (Kernel بخش ۱۶).
- Retry با backoff و فعال‌سازی Circuit Breaker روی Connectorهای بیرونی، در صورت شکست مکرر احراز هویت (Kernel بخش ۱۶؛ مشترک با بخش ۱۴).
- رعایت الزام عدم سکوت در برابر کهنگی داده از طریق وضعیت سلامت Connector (Kernel §16).
- تصمیم‌گیری درباره‌ی مجاز بودن نوشتن — «تصمیم‌های ریسک (مثلاً «آیا این نوشتن مجاز است») مختص Capability «اجرا و اقدام» است» (Kernel بخش ۱۴).
- هرگز به‌عنوان وظیفه‌ی اصلی از سیستم بیرونی نمی‌خواند (Kernel بخش ۱۴).

---

## Non Responsibilities

- خواندن/جذب وضعیت بیرونی به‌عنوان وظیفه‌ی اصلی — «اجرا و اقدام هرگز به‌عنوان وظیفه‌ی اصلی خود از سیستم بیرونی نمی‌خواند» (Kernel بخش ۱۴).
- تعیین محتوای اقدام (استنباط از AC-4: محتوا از مصنوع Decision/Recommendation می‌آید که توسط Decision Support & Recommendation تولید می‌شود، نه این Capability).
- تعیین این‌که آیا تأیید انسانی لازم برای یک اقدام برقرار شده است — این تصمیم به Human Authorization Gate تعلق دارد، نه به این Capability (نگاه کنید بخش «Human Authorization»، ذیل).

---

## Human Authorization

اجرای یک اقدام مصرف‌کننده و اجراکننده‌ی Human Authorization Gate است، نه صادرکننده‌ی آن.

**A. وابستگی به Gate:** عملیات «Execute Action» تابع Human Authorization Gate است (مدل نهایی: Human-Configured Automation + Final Human Confirmation). این Capability اجرا می‌کند؛ Gate را تعریف یا صادر نمی‌کند.

**B. دامنه‌ی پیکربندی‌شده توسط انسان:** خودکارسازی فقط در محدوده‌ی یک دسته/کلاس اقدام که صراحتاً توسط یک انسان پیکربندی شده مجاز است. این Capability اجازه ندارد این دامنه را خودش گسترش دهد.

**C. عدم استنتاج مجوز:** هیچ‌کدام از موارد زیر، به‌تنهایی، اثبات‌کننده‌ی تأیید انسانی نیستند:
- وجود یک `decision_id` معتبر (این فقط یک مکانیزم ردیابی/ارجاع است — AC-4).
- وجود یک مصنوع Decision/Recommendation.
- نتیجه‌ی Write-Risk Decision Evaluator.

**D. تفکیک مسئولیت‌ها:** Human Authorization Gate (الزام تأیید انسانی، سطح رویه‌ای) و Write-Risk Decision Evaluator (طبقه‌بندی فنی ریسک نوشتن، طبق Kernel بخش ۱۴) دو مکانیزم مجزا هستند. هیچ‌کدام جایگزین دیگری نیست.

**E. تأیید نهایی:** پیش از commit نهاییِ برگشت‌ناپذیر/عواقب‌دار روی سیستم بیرونی، سیستم باید: (۱) خلاصه‌ی مختصری از اقدام نهایی مورد نظر به انسان ارائه دهد؛ (۲) تأیید نهایی صریح انسان را دریافت کند؛ (۳) فقط پس از آن، commit نهایی را اجرا کند.

**F. حفظ دامنه:** AI فقط در محدوده‌ی دامنه‌ی مجوزِ صریحاً پیکربندی‌شده توسط انسان مجاز به ادامه‌ی فرآیند است. AI هرگز این دامنه را خودش گسترش نمی‌دهد.

**G. مسئولیت:** Action & Execution اجرا را انجام می‌دهد و شرایط Gate را در نقطه‌ی اجرا اعمال می‌کند، اما هرگز مرجع تعریف سیاست تأیید انسانی نمی‌شود.

---

## Inputs

**Events Consumed:**

**GAP — Not defined by Kernel.**

**Non-Event Inputs:**

مصنوع Decision/Recommendation دارای `decision_id`، تولیدشده توسط Decision Support & Recommendation (AC-4). ساختار دقیق این مصنوع — **GAP. Not defined by Kernel.**

---

## Outputs

**Events Produced:**

**GAP — نام دقیق Event نتیجه‌ی اقدام تعریف نشده (Capability Map §2.9، صریح).**

**Non-Event Outputs:**

**GAP — Not defined by Kernel.**

---

## Owned Concepts

- تصمیم ریسک نوشتن — «تصمیم‌های ریسک (مثلاً "آیا این نوشتن مجاز است") مختص Capability اجرا و اقدام است» (Kernel بخش ۱۴).
- الزام حمل `decision_id` در هر اقدام خودکار (AC-4) — مجزا از مالکیت خودِ مصنوع تصمیم، که متعلق به Decision Support است (Capability Map §2.9).

---

## Internal Modules

این ماژول‌ها پیاده‌سازی منطقی داخل همین Capability‌اند؛ هیچ‌کدام Capability جدید نیستند و هیچ مرز مسئولیتی را تغییر نمی‌دهند.

- **Decision Reference Binder** — حمل و اعتبارسنجی `decision_id` نسبت به مصنوع تصمیم موجود (AC-4).
- **Write-Risk Decision Evaluator** — تصمیم‌گیری درباره‌ی مجاز بودن یک عملیات نوشتن (Kernel بخش ۱۴).
- **Idempotency Key Handler** — اعمال کلید یکتاسازی ترکیبی پیش از اجرای نوشتن (Kernel بخش ۱۶).
- **Retry / Circuit Breaker Handler** — Retry با backoff، و فعال‌سازی مدار قطع در صورت شکست مکرر احراز هویت (Kernel بخش ۱۶؛ مشترک با بخش ۱۴).

فراتر از این چهار مورد، Kernel هیچ ماژول داخلی دیگری برای این Capability تعریف نمی‌کند — **GAP — Not defined by Kernel.**

---

## State

**GAP — Not defined by Kernel** برای هرگونه State اختصاصی این Capability.

رجیستری Connectorها و وضعیت سلامت (بخش ۱۴) در زیرساخت مشترک با Data Ingestion & Integration زندگی می‌کند؛ Kernel صریحاً این را زیرساخت مشترک می‌داند، نه دارایی انحصاری هیچ‌کدام از این دو Capability (Kernel بخش ۱۴). بنابراین این State را نمی‌توان به‌عنوان State اختصاصی این Capability فهرست کرد.

---

## Public Interface

**Illustrative only. Kernel defines behaviour, not callable APIs.** موارد زیر تصویری از عملیات منطقی این Capability‌اند که از Responsibilities/Workflow تعریف‌شده در Kernel استخراج شده‌اند؛ Kernel هیچ API، امضای تابع، یا قرارداد فراخوانی مشخصی تعریف نمی‌کند.

- **Execute Action** — اجرای اقدام روی سیستم بیرونی، با حمل `decision_id` قابل‌ردیابی (AC-4).
- **Evaluate Write Risk** — تصمیم‌گیری درباره‌ی مجاز بودن یک عملیات نوشتن (Kernel بخش ۱۴).

**تصریح:** «Read External State» عمداً در این فهرست نیامده — خواندن به‌عنوان وظیفه‌ی اصلی، صراحتاً غیرمجاز است (Kernel بخش ۱۴؛ Non-Responsibilities). «Determine Action Content» نیز عمداً نیامده — تعیین محتوای اقدام، وظیفه‌ی Decision Support & Recommendation است (استنباط از AC-4؛ Non-Responsibilities).

---

## Internal Workflow

1. Decision Support & Recommendation یک مصنوع Decision/Recommendation دارای شناسه تولید می‌کند — این مرحله خارج از این Capability رخ می‌دهد (AC-4).
2. Decision Reference Binder، اقدام را به آن مصنوع از طریق `decision_id` ارجاع می‌دهد (AC-4).
3. Write-Risk Decision Evaluator تصمیم می‌گیرد آیا این عملیات نوشتن مجاز است (Kernel بخش ۱۴).
4. Idempotency Key Handler، کلید یکتاسازی ترکیبی را پیش از اجرا اعمال می‌کند (Kernel بخش ۱۶).
5. Human Authorization Gate اعمال می‌شود: خلاصه‌ی اقدام نهایی به انسان ارائه و تأیید نهایی صریح او دریافت می‌شود (نگاه کنید بخش «Human Authorization»). بدون این تأیید، مرحله‌ی بعد رخ نمی‌دهد.
6. عملیات نوشتن روی سیستم بیرونی اجرا می‌شود.
7. در صورت شکست مکرر احراز هویت، Retry/Circuit Breaker Handler مدار قطع را فعال می‌کند (Kernel بخش ۱۶).

شکل دقیق خروجی نهایی این فرآیند (تأیید موفقیت، Event نتیجه) — **GAP — Not defined by Kernel** (Capability Map §2.9، Events Produced).

---

## Failure Modes

- **شکست عملیات نوشتن:** از طریق وضعیت سلامت Connector قابل‌مشاهده (Kernel بخش ۱۶). رفتار دقیق پس از شکست (Rollback، عملیات جبرانی، تعداد تلاش مجدد) — **GAP.**
- **شکست مکرر احراز هویت:** فعال‌سازی Circuit Breaker (Kernel بخش ۱۶). آستانه‌ی دقیق «مکرر» — **GAP.**
- **تلاش برای نوشتن تکراری:** کلید یکتاسازی ترکیبی از اجرای دوباره جلوگیری می‌کند (Kernel بخش ۱۶).
- **اقدام بدون `decision_id` معتبر:** الزام حمل `decision_id` صریح است (AC-4)؛ رفتار دقیق این Capability در غیاب یک `decision_id` معتبر — **GAP.**
- **عدم دریافت تأیید نهایی انسان:** اگر خلاصه‌ی اقدام ارائه شود اما تأیید نهایی صریح دریافت نشود (رد، عدم پاسخ، یا بیرون از دامنه‌ی پیکربندی‌شده)، commit نهایی رخ نمی‌دهد؛ اقدام در وضعیت «در انتظار تأیید» باقی می‌ماند. رفتار دقیق timeout/لغو — **GAP.**

---

## Extension Points

تعریف Connector، حالت نوشتن — زیرساخت مشترک با Data Ingestion & Integration (Kernel بخش ۱۴؛ Capability Map §2.9).

---

## Dependencies

**Decision Support & Recommendation** — منبع مصنوع تصمیم/پیشنهاد که `decision_id` به آن ارجاع می‌دهد (AC-4؛ Capability Map §2.9).

---

## Known Gaps

- **Events Produced / Events Consumed** — کاملاً GAP (Capability Map §2.9، صریح).
- **ساختار دقیق مصنوع Decision/Recommendation** — تعریف نشده.
- **State اختصاصی این Capability** — تعریف نشده؛ آنچه هست (رجیستری/سلامت Connector) زیرساخت مشترک با Data Ingestion است، نه مالکیت انحصاری.
- **رفتار دقیق پس از شکست نوشتن (Rollback/جبران)** — تعریف نشده.
- **آستانه‌ی «شکست مکرر» برای Circuit Breaker** — مقدار عددی تعریف نشده.
- **رفتار در غیاب `decision_id` معتبر** — تعریف نشده؛ فقط الزام وجود آن صریح است.
- **نقش دقیق این Capability در انتشار وضعیت سلامت Connector** — آیا این Capability خودش سلامت را منتشر می‌کند یا فقط از طریق زیرساخت مشترک مصرف می‌کند، Kernel به‌طور جداگانه برای این Capability مشخص نکرده (بخش ۱۴ فقط می‌گوید انتشار سلامت بخشی از زیرساخت مشترک است).

---

## Engineering Notes

- انتخاب فناوری/SDK خاص برای نوشتن روی هر نوع سیستم بیرونی، یک تصمیم پیاده‌سازی است و خارج از دامنه‌ی Kernel قرار دارد (Kernel بخش ۲۱).
- مکانیزم دقیق Rollback یا عملیات جبرانی پس از شکست نوشتن، جزئیات پیاده‌سازی است؛ Kernel فقط الزام Idempotency و Retry/Circuit Breaker را وضع کرده، نه رفتار دقیق پس از شکست (بخش ۱۶).
- از آنجا که زیرساخت Connector با Data Ingestion & Integration مشترک است (بخش ۱۴)، قرارداد دقیق فنی این اشتراک باید در یک Interaction Contract جداگانه تعریف شود، نه در این سند.
