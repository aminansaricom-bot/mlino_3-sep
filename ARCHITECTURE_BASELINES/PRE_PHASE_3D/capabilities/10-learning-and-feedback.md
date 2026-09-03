# Capability Specification — Learning & Feedback

## Status
Frozen v1.0

---

## Purpose
تولید Event مقایسه‌ی نتیجه در چرخه‌ی تأخیری (Kernel بخش ۶)؛ واکنش به اجرای حق فراموشی روی مدل‌های مشتق‌شده (Kernel بخش ۱۳؛ Capability Map v1.0 §2.10).

---

## Responsibilities
- تولید Event درون‌زای مقایسه‌ی نتیجه در چرخه‌ی یادگیری تأخیری (Kernel بخش ۶: «درون‌زا: تولیدشده توسط منطق داخلی خود Kernel (مثال: `ConsentExpired`، رویداد مقایسه‌ی نتیجه در یادگیری تأخیری، پرچم Materiality)»).
- پرچم‌گذاری بازبینی مدل‌های مشتق‌شده پس از اجرای حق فراموشی — «یادگیری: مدل‌های مشتق‌شده پرچم بازبینی می‌خورند» (Kernel بخش ۱۳).

---

## Non Responsibilities

**GAP — Not defined by Kernel.**

Capability Map §2.10 صراحتاً این بند را GAP علامت زده است؛ هیچ محدودیت یا استثنای رفتاری صریحی برای این Capability تعریف نشده.

---

## Inputs

**Events Consumed:**

**GAP — Not defined by Kernel.**

بخش ۱۳ محرک واکنش یادگیری را «هویت فراموش‌شده» (اجرای Right To Be Forgotten) می‌داند، نه رویداد `ConsentRevoked` بخش ۱۱؛ این دو مفهوم متفاوت‌اند و Kernel نام Event مشخصی برای محرک اجرای RTBF تعیین نکرده است (Capability Map §2.10، صریح؛ ثبت‌شده به‌عنوان بند **G4** در فهرست GAP‌های سراسری Capability Map §5).

**Non-Event Inputs:**

**Projection** — Kernel در نمودار چرخه Event نشان می‌دهد که Projection می‌تواند توسط Learning مصرف شود (Kernel §7).

فراتر از این، هیچ داده‌ی غیر-Event دیگری (مثلاً ساختار دقیق «هویت فراموش‌شده») که این Capability را از اجرای RTBF آگاه کند، در Kernel یا Capability Map §2.10 نام برده نشده — **GAP — Not defined by Kernel.**

---

## Outputs

**Events Produced:**

Event درون‌زای مقایسه‌ی نتیجه در چرخه‌ی یادگیری تأخیری (Kernel §6). نام دقیق Event توسط Kernel تعریف نشده است.

نام اختصاصی فراتر از توصیف عمومی «رویداد مقایسه‌ی نتیجه در یادگیری تأخیری» در Kernel تعریف نشده؛ طبق Kernel بخش ۴، فقدان نام اختصاصی، خودش یک GAP محسوب نمی‌شود («نام‌گذاری صریح فقط در مواردی الزامی است که یک Kernel Invariant صراحتاً آن را بخواهد»).

**Non-Event Outputs:**

**پرچم بازبینی (Review Flag)** روی مدل‌های مشتق‌شده، پس از اجرای حق فراموشی روی یک هویت — «یادگیری: مدل‌های مشتق‌شده پرچم بازبینی می‌خورند» (Kernel بخش ۱۳). ساختار دقیق این پرچم — **GAP. Not defined by Kernel.**

---

## Owned Concepts

**GAP — Not defined by Kernel.**

Capability Map §2.10 صراحتاً می‌گوید: «GAP» — هیچ اقتدار انحصاری صریحی در Kernel به این Capability نسبت داده نشده؛ ثبت‌شده به‌عنوان بخشی از بند **G6** در فهرست GAP‌های سراسری Capability Map (§5).

---

## Internal Modules

این ماژول‌ها پیاده‌سازی منطقی داخل همین Capability‌اند؛ هیچ‌کدام Capability جدید نیستند و هیچ مرز مسئولیتی را تغییر نمی‌دهند.

- **Outcome Comparison Event Generator** — تولید Event درون‌زای مقایسه‌ی نتیجه در چرخه‌ی یادگیری تأخیری (Kernel بخش ۶).
- **Derived Model Review Flagger** — پرچم‌گذاری بازبینی روی مدل‌های مشتق‌شده، پس از اجرای حق فراموشی روی یک هویت مرتبط (Kernel بخش ۱۳).

فراتر از این دو مورد، Kernel هیچ ماژول داخلی دیگری (مثلاً موتور آموزش مدل، ارزیاب کیفیت) برای این Capability تعریف نمی‌کند — **GAP — Not defined by Kernel.**

---

## State

**GAP — Not defined by Kernel.**

نه Kernel و نه Capability Map §2.10 هیچ ساختار داخلی State (مشابه Event Log/Projection در Memory & Knowledge) برای این Capability تعریف می‌کنند.

---

## Public Interface

**Illustrative only. Kernel defines behaviour, not callable APIs.** موارد زیر تصویری از عملیات منطقی این Capability‌اند که از Responsibilities تعریف‌شده در Kernel استخراج شده‌اند؛ Kernel هیچ API، امضای تابع، یا قرارداد فراخوانی مشخصی تعریف نمی‌کند.

- **Generate Outcome Comparison Event** — تولید Event درون‌زای مقایسه‌ی نتیجه در چرخه‌ی یادگیری تأخیری (Kernel بخش ۶).
- **Flag Derived Models For Review** — پرچم‌گذاری بازبینی مدل‌های مشتق‌شده پس از اجرای حق فراموشی (Kernel بخش ۱۳).

**تصریح:** «Train Model» / «Update Model» / «Retrain» عمداً در این فهرست نیامده — Kernel هیچ عملیات آموزش یا به‌روزرسانی مدل را برای این Capability تعریف نمی‌کند؛ انتخاب مدل‌های یادگیری ماشین خاص صراحتاً عدم‌هدف Kernel است (Kernel بخش ۲۱).

---

## Internal Workflow

1. **GAP — Not defined by Kernel.** Kernel گام دقیق آغاز چرخه‌ی مقایسه‌ی نتیجه‌ی تأخیری (چه چیزی/چه زمانی این چرخه را شروع می‌کند) را تعریف نمی‌کند.
2. Outcome Comparison Event Generator، یک Event درون‌زا از نوع مقایسه‌ی نتیجه تولید می‌کند (Kernel بخش ۶).
3. **GAP — Not defined by Kernel.** مکانیزم دقیق آگاهی این Capability از اجرای RTBF روی یک هویت خاص، تعریف نشده (رجوع به بخش Inputs، GAP؛ Capability Map §5، بند G4).
4. Derived Model Review Flagger، مدل‌های مشتق‌شده‌ی مرتبط با آن هویت را پرچم بازبینی می‌زند (Kernel بخش ۱۳).
5. **GAP — Not defined by Kernel.** رفتار پس از پرچم‌گذاری (بازآموزی خودکار، توقف مصرف مدل، یا بازبینی دستی) در Kernel یا Capability Map تعریف نشده.

---

## Failure Modes

**GAP — Not defined by Kernel.**

نه Kernel و نه Capability Map §2.10 هیچ رفتار شکست مشخصی (مثلاً عدم تولید Event مقایسه، تأخیر در پرچم‌گذاری، یا تعارض بین چند پرچم بازبینی هم‌زمان) برای این Capability تعریف نمی‌کنند.

---

## Extension Points

**GAP — Not defined by Kernel.**

Capability Map §2.10 صراحتاً این بند را GAP علامت زده است.

---

## Dependencies
**Trust, Explainability & Governance** — مالک قرارداد حق فراموشی (Kernel بخش ۱۳؛ Capability Map v1.0 §2.10).

---

## Known Gaps
- **Owned Concepts** — هیچ اقتدار انحصاری صریحی تعریف نشده؛ ثبت‌شده به‌عنوان بخشی از بند **G6** در فهرست GAP‌های سراسری Capability Map (§5).
- **Events Consumed** — محرک دقیق واکنش این Capability به اجرای RTBF نام‌گذاری نشده؛ ثبت‌شده به‌عنوان بند **G4** در فهرست GAP‌های سراسری Capability Map (§5).
- **Canonical Event Name** — Kernel وجود Event را نشان می‌دهد اما نام رسمی آن را تعریف نمی‌کند.
- **ساختار دقیق پرچم بازبینی (Review Flag)** — تعریف نشده.
- **Non Responsibilities** — هیچ محدودیت رفتاری صریحی برای این Capability تعریف نشده.
- **State** — هیچ ساختار داخلی State برای این Capability تعریف نشده.
- **Internal Workflow** — فراتر از دو گام تعریف‌شده (تولید Event مقایسه، پرچم‌گذاری بازبینی)، هیچ جریان پردازشی دیگری (به‌ویژه مکانیزم آگاهی از RTBF، و رفتار پس از پرچم‌گذاری) تعریف نشده.
- **Failure Modes** — هیچ رفتار شکست مشخصی تعریف نشده.
- **Extension Points** — هیچ نقطه‌ی توسعه‌ای برای این Capability در Kernel تعریف نشده (Capability Map §2.10، صریح).

---

## Engineering Notes
- از آنجا که انتخاب مدل‌های یادگیری ماشین خاص صراحتاً عدم‌هدف Kernel است (Kernel بخش ۲۱)، الگوریتم یا فناوری دقیق مقایسه‌ی نتیجه و بازآموزی مدل، یک تصمیم پیاده‌سازی است و خارج از دامنه‌ی این سند قرار دارد.
- از آنجا که مکانیزم دقیق آگاهی این Capability از اجرای RTBF در Kernel تعریف نشده (بند G4)، قرارداد دقیق این اطلاع‌رسانی (Event، فراخوانی مستقیم، یا مکانیزم دیگر) باید در Interaction Contract مشخص شود.
- از آنجا که Owned Concepts این Capability به‌صراحت GAP است (Capability Map §2.10)، تعیین دقیق مرزهای پیاده‌سازی این Capability، تصمیم پیاده‌سازی است و خارج از دامنه‌ی Kernel قرار دارد.
