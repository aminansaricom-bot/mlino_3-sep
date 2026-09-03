# Capability Specification — Trust, Explainability & Governance

## Status
Frozen v1.0

---

## Purpose
مرجع انحصاری تصمیم دسترسی (Kernel AC-2)؛ دارنده‌ی دسترسی ممتاز به Event Log خودش (Kernel AC-5؛ Capability Map v1.0 §2.11).

---

## Responsibilities
- ارزیابی سیاست دسترسی — «قانون بنیادی (AC-2): فقط Capability حاکمیت مجاز به ارزیابی و صدور مجوز دسترسی است» (Kernel AC-2؛ بخش ۱۲).
- کش تصمیم دسترسی در سطح جلسه برای جلوگیری از ارزیابی مکرر — «تصمیمات دسترسی در سطح جلسه (Session) کش می‌شوند؛ یک تصمیم دسترسی، پس از اولین ارزیابی در یک جلسه، تا پایان همان جلسه دوباره محاسبه نمی‌شود» (Kernel بخش ۱۲).
- عدم پذیرش نقطه‌ی توسعه‌ی صنعتی — «Capability «اعتماد، توضیح‌پذیری و حاکمیت» هیچ نقطه‌ی توسعه‌ی صنعتی نمی‌پذیرد» (Kernel بخش ۲۰).
- تولید Eventهای رضایت (Kernel بخش ۱۱؛ INV-4).

---

## Non Responsibilities
- سفارشی‌سازی صنعتی/سازمانی قوانین دسترسی، رضایت و مالکیت از طریق Domain Pack یا سطح سازمانی — «قوانین دسترسی، رضایت و مالکیت، مستقیماً توسط Kernel اجرا می‌شوند و نمی‌توانند از طریق Domain Pack یا سطح سازمانی سفارشی‌سازی شوند» (Kernel بخش ۲۰، صریح).

---

## Inputs

**Events Consumed:**

**GAP — Not defined by Kernel.**

فراتر از «وضعیت مالکیت/رضایت» (که خود به‌شکل Event مدل شده، Kernel بخش ۱۰، ۱۱، ۱۲) نام دقیق Event ورودی مشخص نیست (Capability Map §2.11، صریح).

**Non-Event Inputs:**

**Projection** — ارزیابی سیاست دسترسی وابسته به خواندن Projection تولیدشده توسط Memory & Knowledge است؛ «"تصویر لحظه‌ای" مذکور، همان Projection تولیدشده توسط Capability «حافظه و دانش» است... بنابراین ارزیابی سیاست دسترسی، وابسته به خواندن Projection حافظه است» (Kernel بخش ۱۲، صریح؛ بخش ۸).

---

## Outputs

**Events Produced:**

`ConsentGranted`، `ConsentRenewed`، `ConsentRevoked`، `ConsentExpired` (Kernel بخش ۱۱؛ INV-4). نام‌گذاری صریح این چهار Event طبق Kernel بخش ۴ الزامی است، چون INV-4 صراحتاً آن را می‌خواهد: «نام‌گذاری صریح (مانند چهار حالت `ConsentGranted/Renewed/Revoked/Expired`) فقط در مواردی الزامی است که یک Kernel Invariant صراحتاً آن را بخواهد (مثل INV-4)».

**Non-Event Outputs:**

**تصمیم دسترسی (Access Decision)** — خروجی ارزیابی سیاست دسترسی؛ مصرف‌شده توسط سایر Capabilityها (مثلاً Communication & Narrative، Kernel بخش ۱۵: «ارتباط و روایت → حاکمیت (Access Policy): روایت هرگز محتوایی را که درخواست‌کننده مجاز به دیدنش نیست، بیان نمی‌کند»). ساختار دقیق این تصمیم — **GAP. Not defined by Kernel.**

---

## Owned Concepts
- تصمیم دسترسی (Kernel AC-2).
- دسترسی ممتاز به Event Log رضایت/دسترسی خودش (Kernel AC-5).
- استثنای عدم‌توسعه‌پذیری (Kernel بخش ۲۰).

---

## Internal Modules

این ماژول‌ها پیاده‌سازی منطقی داخل همین Capability‌اند؛ هیچ‌کدام Capability جدید نیستند و هیچ مرز مسئولیتی را تغییر نمی‌دهند.

- **Access Policy Evaluator** — ارزیابی سیاست دسترسی بر پایه‌ی وضعیت مالکیت و رضایت (Kernel AC-2؛ بخش ۱۲).
- **Session Decision Cache** — کش تصمیم دسترسی در سطح جلسه تا پایان همان جلسه (Kernel بخش ۱۲).
- **Consent Event Producer** — تولید Eventهای `ConsentGranted`/`ConsentRenewed`/`ConsentRevoked`/`ConsentExpired` (Kernel بخش ۱۱).
- **Self-Critique Service Provider** — ارائه‌ی سرویس خودانتقادی که پیش از نهایی‌شدن هر پیشنهاد توسط Decision Support & Recommendation مصرف می‌شود؛ این سرویس یک سرویس عرضی زیر حاکمیت است (Kernel بخش ۱۵: «پشتیبانی تصمیم → حاکمیت (Self-Critique): هر پیشنهاد پیش از نهایی‌شدن باید از بررسی خودانتقادی (سرویس عرضی زیر حاکمیت) عبور کند»).

فراتر از این چهار مورد، Kernel هیچ ماژول داخلی دیگری برای این Capability تعریف نمی‌کند — **GAP — Not defined by Kernel.**

---

## State

**GAP — Not defined by Kernel** برای هرگونه ساختار داخلی State اختصاصی.

دسترسی ممتاز این Capability به Event Log رضایت/دسترسی خودش (Kernel AC-5) به معنای مالکیت مجزای آن Event Log نیست؛ Event Log تحت مالکیت انحصاری Memory & Knowledge قرار دارد (Kernel بخش ۸). بنابراین این را نمی‌توان State اختصاصی این Capability دانست.

---

## Public Interface

**Illustrative only. Kernel defines behaviour, not callable APIs.** موارد زیر تصویری از عملیات منطقی این Capability‌اند که از Responsibilities تعریف‌شده در Kernel استخراج شده‌اند؛ Kernel هیچ API، امضای تابع، یا قرارداد فراخوانی مشخصی تعریف نمی‌کند.

- **Evaluate Access Policy** — ارزیابی و صدور تصمیم دسترسی (Kernel AC-2؛ بخش ۱۲).
- **Produce Consent Event** — تولید یکی از چهار Event رضایت (Kernel بخش ۱۱).
- **Provide Self-Critique Review** — ارائه‌ی بررسی خودانتقادی به یک پیشنهاد پیش از نهایی‌شدن آن (Kernel بخش ۱۵).

**تصریح:** «Customize Access Rule» / «Accept Industry Extension» عمداً در این فهرست نیامده — این Capability هیچ نقطه‌ی توسعه‌ی صنعتی نمی‌پذیرد (Kernel بخش ۲۰، صریح؛ Non-Responsibilities).

---

## Internal Workflow

1. Access Policy Evaluator، وضعیت مالکیت و رضایت را از Projection حافظه می‌خواند (Kernel بخش ۱۲).
2. در صورت نبود تصمیم کش‌شده برای همان جلسه، Access Policy Evaluator تصمیم دسترسی را صادر می‌کند؛ در غیر این صورت، Session Decision Cache تصمیم قبلی همان جلسه را بازمی‌گرداند (Kernel بخش ۱۲).
3. **GAP — Not defined by Kernel.** مکانیزم دقیق تحویل تصمیم دسترسی به Capability درخواست‌کننده (مثلاً Communication & Narrative) تعریف نشده.
4. مستقل از این جریان، Consent Event Producer به‌محض تغییر وضعیت رضایت (اعطا، تمدید، لغو، انقضا)، Event رضایت متناظر را تولید می‌کند (Kernel بخش ۱۱).
5. مستقل از این جریان، Self-Critique Service Provider هر پیشنهاد ارسالی از Decision Support & Recommendation را پیش از نهایی‌شدن آن بررسی می‌کند (Kernel بخش ۱۵).

---

## Failure Modes

**GAP — Not defined by Kernel.**

نه Kernel و نه Capability Map §2.11 هیچ رفتار شکست مشخصی (مثلاً تعارض هم‌زمان چند تصمیم دسترسی، یا شکست خواندن Projection حافظه) برای این Capability تعریف نمی‌کنند.

---

## Extension Points

**ندارد — استثنای صریح.**

«Capability «اعتماد، توضیح‌پذیری و حاکمیت» هیچ نقطه‌ی توسعه‌ی صنعتی نمی‌پذیرد» (Kernel بخش ۲۰؛ Capability Map v1.0 §2.11).

---

## Dependencies
**Memory & Knowledge** — «ارزیابی سیاست دسترسی، وابسته به خواندن Projection حافظه است» (Kernel بخش ۱۲، صریح؛ Capability Map v1.0 §2.11).

---

## Known Gaps
- **Events Consumed** — فراتر از وضعیت مالکیت/رضایت (که خود Event-Sourced است)، نام دقیق Event ورودی مشخص نشده (Capability Map §2.11، صریح).
- **ساختار دقیق تصمیم دسترسی (Access Decision)** — تعریف نشده.
- **مکانیزم تحویل تصمیم دسترسی به Capability درخواست‌کننده** — تعریف نشده.
- **قرارداد دقیق فراخوانی سرویس خودانتقادی (Self-Critique)** — Kernel فقط الزام وجود این بررسی پیش از نهایی‌شدن هر پیشنهاد را وضع می‌کند (بخش ۱۵)؛ جزئیات فراخوانی (همزمان/ناهمزمان، فرمت پاسخ، معیار دقیق رد/قبول) نه در Kernel و نه در Capability Map §2.11 تعریف شده است.
- **State اختصاصی این Capability** — تعریف نشده؛ Event Log رضایت/دسترسی بخشی از Event Log عمومی تحت مالکیت Memory & Knowledge است، نه دارایی مجزای این Capability.
- **Failure Modes** — هیچ رفتار شکست مشخصی تعریف نشده.

---

## Engineering Notes
- از آنجا که Kernel هیچ الگوریتم یا فناوری خاصی برای ارزیابی سیاست دسترسی تعریف نمی‌کند، پیاده‌سازی دقیق این منطق (مثلاً موتور قانون یا سرویس تصمیم) یک تصمیم پیاده‌سازی است و خارج از دامنه‌ی این سند قرار دارد.
- از آنجا که ساختار دقیق «تصمیم دسترسی» و «Event رضایت» فراتر از نام و محتوای کلی تعریف نشده (Kernel بخش ۱۱، ۱۲)، طرح دقیق payload این مصنوعات باید در یک Interaction Contract جداگانه تعریف شود، نه اینجا.
- از آنجا که این Capability هیچ نقطه‌ی توسعه‌ی صنعتی نمی‌پذیرد (Kernel بخش ۲۰، صریح)، هیچ مکانیزم Plugin یا Override سطح Domain Pack نباید برای منطق این Capability طراحی شود؛ این یک محدودیت معماری صریح است، نه یک انتخاب پیاده‌سازی.
