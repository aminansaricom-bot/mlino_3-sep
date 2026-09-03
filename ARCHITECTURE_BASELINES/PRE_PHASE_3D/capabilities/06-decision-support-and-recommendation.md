# Capability Specification — Decision Support & Recommendation

## Status
Frozen v1.0

---

## Purpose
تولید تصمیم/پیشنهاد دارای شناسه‌ی قابل‌ارجاع، مشروط به عبور از خودانتقادی حاکمیت (Capability Map v1.0 §2.6؛ Kernel بخش ۱۵).

---

## Responsibilities
- مصرف سرویس خودانتقادی حاکمیت پیش از نهایی‌سازی هر پیشنهاد — «هر پیشنهاد پیش از نهایی‌شدن باید از بررسی خودانتقادی (سرویس عرضی زیر حاکمیت) عبور کند» (Kernel بخش ۱۵؛ Capability Map §2.6).
- تولید مصنوع Decision/Recommendation که Action & Execution از طریق `decision_id` به آن ارجاع می‌دهد — «هر اقدام خودکار روی دنیای بیرون (Action & Execution) باید به یک Decision/Recommendation مشخص ارجاع قابل‌ردیابی داشته باشد» (Kernel AC-4؛ Capability Map §2.6).

---

## Non Responsibilities
- اجرای منطق خودانتقادی — این یک سرویس عرضی (cross-cutting) است که زیر مسئولیت حاکمیت قرار دارد، نه منطق داخلی این Capability (Kernel بخش ۱۵؛ Capability Map §2.6).
- اجرای اقدام روی دنیای بیرون — این وظیفه‌ی انحصاری Action & Execution است؛ Decision Support فقط مصنوع تصمیم را تولید می‌کند، اجرایش نمی‌کند (Kernel AC-4؛ Capability Map §2.6، §2.9).

---

## Inputs

**Events Consumed:**

**GAP — توسط Kernel تعریف نشده است.**

Capability Map §2.6 صراحتاً «Events Consumed» را GAP علامت زده است.

**Non-Event Inputs:**

**GAP — توسط Kernel تعریف نشده است.**

برخلاف Reasoning & Causal Analysis که Kernel صراحتاً Projection را به‌عنوان ورودی آن معرفی می‌کند (Kernel بخش ۸)، هیچ بخشی از Kernel یا Capability Map §2.6 داده‌ی ورودی مشخصی (Projection یا غیر آن) را برای فرآیند تولید پیشنهاد در این Capability نام نمی‌برد.

---

## Outputs

**Events Produced:**

**GAP — توسط Kernel تعریف نشده است** برای نام دقیق Event.

Capability Map §2.6 صراحتاً می‌گوید: «نام دقیق Event تعریف نشده؛ فقط الزام شناسه‌ی قابل‌ارجاع صریح است (AC-4)». این GAP در فهرست GAP‌های سراسری Capability Map نیز به‌عنوان بند **G5** ثبت شده (Capability Map §5: «نام‌گذاری دقیق Eventهای: ... مصنوع Decision/Recommendation (Decision Support) — Kernel فقط الزام ساختاری/ارجاعی وضع کرده، نه نام‌گذاری صریح»).

آنچه صریح است: مصنوع خروجی باید یک شناسه‌ی قابل‌ارجاع (`decision_id`) حمل کند که Action & Execution بتواند به آن ارجاع دهد (Kernel AC-4).

Kernel صرفاً وجود یک مصنوع Decision/Recommendation قابل‌ردیابی دارای `decision_id` را الزامی می‌کند و مشخص نمی‌کند این مصنوع با چه ساختار داده‌ای پیاده‌سازی شود. این انتخاب خارج از دامنه‌ی Kernel و یک تصمیم پیاده‌سازی است.

---

## Owned Concepts
مصنوع Decision/Recommendation قابل‌ارجاع (Kernel AC-4، بخش ۱۵؛ Capability Map §2.6، صریح).

این تنها Owned Concept صریح این Capability است. برخلاف Reasoning & Causal Analysis (Capability Specification 03) که Owned Concepts آن کاملاً GAP بود، Capability Map §2.6 برای Decision Support یک اقتدار انحصاری مشخص تعریف کرده: مالکیت خودِ مصنوع تصمیم/پیشنهاد. توجه: الزام حمل `decision_id` توسط Action & Execution (AC-4) مالکیت مصنوع تصمیم را به این Capability تغییر نمی‌دهد — Action & Execution فقط ارجاع می‌دهد؛ Owned Concept همچنان نزد Decision Support باقی می‌ماند (Capability Map §2.9، بخش «Owned Concepts» آن: «الزام حمل `decision_id`... مجزا از مالکیت خودِ مصنوع تصمیم، که متعلق به Decision Support است»).

---

## Internal Modules

این ماژول‌ها پیاده‌سازی منطقی داخل همین Capability‌اند؛ هیچ‌کدام Capability جدید نیستند و هیچ مرز مسئولیتی را تغییر نمی‌دهند.

- **Decision Artifact Lifecycle Manager** — مسئول ایجاد و نهایی‌سازی مصنوع Decision/Recommendation در طول چرخه پردازش این Capability است. Kernel هیچ الگوریتم داخلی برای این فرآیند تعریف نمی‌کند.
- **Self-Critique Gate Consumer** — پیش از نهایی‌سازی، مصنوع را به سرویس خودانتقادی حاکمیت ارسال می‌کند (Kernel بخش ۱۵). این ماژول منطق خودانتقادی را اجرا نمی‌کند و صرفاً سرویس حاکمیت را مصرف می‌کند (Non-Responsibilities).

---

## State

**GAP — توسط Kernel تعریف نشده است.**

نه Kernel و نه Capability Map §2.6 هیچ ساختار داخلی State (مشابه Event Log/Projection در Memory & Knowledge) برای این Capability تعریف نمی‌کنند.

---

## Public Interface

**صرفاً تصویری. Kernel رفتار را تعریف می‌کند، نه APIهای قابل‌فراخوانی.** موارد زیر تصویری از عملیات منطقی این Capability‌اند که از Responsibilities/Workflow تعریف‌شده در Kernel استخراج شده‌اند؛ Kernel هیچ API، امضای تابع، یا قرارداد فراخوانی مشخصی تعریف نمی‌کند.

- **Generate Decision Artifact** — ایجاد مصنوع Decision/Recommendation مطابق مسئولیت این Capability.
- **Submit Decision For Self-Critique** — ارسال پیشنهاد برای بررسی خودانتقادی.
- **Finalize Decision Artifact** — نهایی‌سازی مصنوع Decision/Recommendation.

**تصریح:** «Execute Action» عمداً در این فهرست نیامده — اجرای اقدام، وظیفه‌ی انحصاری Action & Execution است، نه این Capability (Kernel AC-4؛ Capability Map §2.6 Non-Responsibilities). «Perform Self-Critique» نیز عمداً نیامده — خودِ منطق خودانتقادی سرویس عرضی زیر حاکمیت است، نه این Capability (Kernel بخش ۱۵؛ Non-Responsibilities).

---

## Internal Workflow

1. Decision Artifact Lifecycle Manager مصنوع اولیه Decision/Recommendation را ایجاد می‌کند. Kernel مکانیزم داخلی ایجاد این مصنوع را تعریف نمی‌کند (رجوع به بخش Inputs، GAP).
2. پیش از نهایی‌شدن، Self-Critique Gate Consumer پیشنهاد را به سرویس خودانتقادی حاکمیت ارسال می‌کند؛ این یک الزام صریح Kernel است، نه یک گام اختیاری (Kernel بخش ۱۵: «هر پیشنهاد پیش از نهایی‌شدن باید از بررسی خودانتقادی... عبور کند»).
3. رفتار سیستم در صورت رد پیشنهاد توسط خودانتقادی (بازنویسی؟ توقف؟ بازگشت به گام ۱؟) در Kernel یا Capability Map تعریف نشده (رجوع به بخش Failure Modes، GAP).
4. پس از عبور موفق از خودانتقادی، Decision Artifact Lifecycle Manager همان مصنوع را نهایی کرده و شناسه‌ی قابل‌ارجاع `decision_id` را به آن اختصاص می‌دهد (Kernel AC-4).
5. این مصنوع در دسترس Action & Execution قرار می‌گیرد تا در صورت اجرای یک اقدام خودکار، از طریق `decision_id` به آن ارجاع دهد (Kernel AC-4؛ Capability Map §2.9).

---

## Failure Modes

**GAP — توسط Kernel تعریف نشده است.**

نه Kernel و نه Capability Map §2.6 مشخص نمی‌کنند در صورت رد پیشنهاد توسط سرویس خودانتقادی حاکمیت (گام ۳ در Internal Workflow) چه اتفاقی می‌افتد. هیچ رفتار Retry، Fallback، یا لغو صریحی تعریف نشده.

---

## Extension Points

**GAP — توسط Kernel تعریف نشده است.**

Capability Map §2.6 صراحتاً این بند را GAP علامت زده است.

---

## Dependencies
**Trust, Explainability & Governance** — به‌واسطه‌ی مصرف سرویس خودانتقادی (Self-Critique) که پیش از نهایی‌شدن هر پیشنهاد الزامی است (Kernel بخش ۱۵؛ Capability Map §2.6، و ماتریس وابستگی Capability Map §3: «Decision Support & Recommendation | Trust, Explainability & Governance | بخش ۱۵ (سرویس خودانتقادی)»).

---

## Known Gaps
- **Events Produced** — نام دقیق Event تعریف نشده؛ فقط الزام ساختاری شناسه‌ی قابل‌ارجاع صریح است (Capability Map §2.6؛ ثبت‌شده به‌عنوان بند **G5** در فهرست GAP‌های سراسری Capability Map §5).
- **Events Consumed** — کاملاً GAP؛ هیچ Event ورودی مشخصی تعریف نشده (Capability Map §2.6، صریح).
- **Non-Event Inputs** — داده‌ای که فرآیند تولید پیشنهاد را تغذیه می‌کند (مثلاً Projection یا منبع دیگر) در Kernel یا Capability Map نام برده نشده.
- **State** — هیچ ساختار داخلی State برای این Capability تعریف نشده.
- **Failure Modes** — رفتار سیستم در صورت رد پیشنهاد توسط خودانتقادی حاکمیت تعریف نشده.
- **Extension Points** — هیچ نقطه‌ی توسعه‌ای برای این Capability در Kernel تعریف نشده (Capability Map §2.6، صریح).

---

## Engineering Notes
- از آنجا که Kernel هیچ مکانیزم داخلی برای تولید یا ساخت Decision/Recommendation تعریف نمی‌کند (Kernel بخش ۲۱: انتخاب مدل یا الگوریتم خارج از دامنه‌ی Kernel است)، انتخاب الگوریتم، مدل، یا منطق قانون‌محور برای تولید پیشنهاد، یک تصمیم پیاده‌سازی است.
- از آنجا که سرویس خودانتقادی زیر حاکمیت است نه زیر این Capability (Non-Responsibilities)، قرارداد دقیق فراخوانی آن سرویس (همزمان/ناهمزمان، فرمت پاسخ، معیار رد/قبول) باید در Capability Specification حاکمیت یا در یک Interaction Contract جداگانه تعریف شود، نه اینجا.
- از آنجا که Owned Concept این Capability (برخلاف Reasoning) صریحاً تعریف شده، هر تصمیم پیاده‌سازی که مالکیت مصنوع Decision/Recommendation را به Capability دیگری (مثلاً Action & Execution) منتقل کند، ناقض Capability Map §2.6 و §2.9 خواهد بود.
- چرخه داخلی ایجاد، تغییر و نهایی‌سازی مصنوع Decision/Recommendation یک تصمیم پیاده‌سازی است؛ Kernel فقط رفتار قابل مشاهده و الزامات ارجاع‌پذیری (decision_id) را محدود می‌کند.
