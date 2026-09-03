# Capability Specification — Data Ingestion & Integration

## Status
Frozen v1.0

---

## Purpose

مسیر انحصاری تولید Eventهای برون‌زا از طریق Connector (Kernel بخش ۶: «برون‌زا: از طریق Connectorها، تحت Capability «جذب و یکپارچه‌سازی داده»»؛ Capability Map v1.0 §2.8).

---

## Responsibilities

- تولید Event با `producer_type: external` (Kernel بخش ۴، ۶).
- Idempotency عملیات جذب با کلید یکتاسازی ترکیبی (Kernel بخش ۱۶: «هر عملیات جذب داده و اجرا باید Idempotent باشد (کلید یکتاسازی ترکیبی)»).
- Retry با backoff برای Connectorهای بیرونی، و فعال‌سازی Circuit Breaker در صورت شکست مکرر احراز هویت (Kernel بخش ۱۶).
- عدم سکوت در برابر کهنگی داده — انتشار از طریق وضعیت سلامت Connector (Kernel بخش ۱۶: «کهنگی داده هرگز نباید بی‌صدا باشد — باید از طریق وضعیت سلامت Connector قابل‌مشاهده باشد»).
- هرگز به سیستم بیرونی نمی‌نویسد (Kernel بخش ۱۴، صریح).

---

## Non Responsibilities

- نوشتن روی سیستم بیرونی — «جذب و یکپارچه‌سازی داده هرگز به سیستم بیرونی نمی‌نویسد» (Kernel بخش ۱۴).
- تصمیم اعتبار Business Event (Admission Policy) — وظیفه‌ی انحصاری Domain Adaptation & Semantic Translation (Kernel بخش ۷؛ AC-1).

---

## Inputs

**Events Consumed:**

**GAP — Not defined by Kernel.**

ورودی این Capability داده‌ی خام از سیستم‌های بیرونی است، نه یک Event به‌شکل نهایی؛ Kernel این ورودی را «Event مصرفی» نمی‌نامد (Capability Map §2.8، صریح).

**Non-Event Inputs:**

داده‌ی خام از Connector، طبق Sync Strategی اعلام‌شده‌ی همان Connector (Polling/Webhook/CDC) (Kernel بخش ۱۴). ساختار دقیق این داده‌ی خام — **GAP. Not defined by Kernel.**

---

## Outputs

**Events Produced:**

Occurrence / Amendment / Retraction با `producer_type: external` (Kernel بخش ۴، ۶؛ Capability Map §2.8).

**Non-Event Outputs:**

وضعیت سلامت Connector: Healthy / Delayed / Offline / Authentication Failed / Schema Changed (Kernel بخش ۱۴، فهرست صریح).

---

## Owned Concepts

مسیر تولید Event برون‌زا — «برون‌زا: از طریق Connectorها، تحت Capability «جذب و یکپارچه‌سازی داده»» (Kernel بخش ۶؛ Capability Map §2.8).

---

## Internal Modules

این ماژول‌ها پیاده‌سازی منطقی داخل همین Capability‌اند؛ هیچ‌کدام Capability جدید نیستند و هیچ مرز مسئولیتی را تغییر نمی‌دهند.

- **External Event Producer** — تولید Event با `producer_type: external` (Kernel بخش ۴، ۶).
- **Idempotency Key Handler** — اعمال کلید یکتاسازی ترکیبی پیش از تولید نهایی Event (Kernel بخش ۱۶).
- **Retry / Circuit Breaker Handler** — Retry با backoff، و فعال‌سازی مدار قطع در صورت شکست مکرر احراز هویت (Kernel بخش ۱۶).
- **Connector Health Publisher** — انتشار وضعیت سلامت (Healthy/Delayed/Offline/Authentication Failed/Schema Changed) (Kernel بخش ۱۴، ۱۶).

فراتر از این چهار مورد، Kernel هیچ ماژول داخلی دیگری (مثلاً تجزیه‌گر قالب داده‌ی خاص، نگاشت‌یاب اولیه) برای این Capability تعریف نمی‌کند — **GAP — Not defined by Kernel.**

---

## State

**GAP — Not defined by Kernel** برای هرگونه State اختصاصی این Capability.

رجیستری Connectorها و وضعیت سلامت (بخش ۱۴) در زیرساخت مشترک با Action & Execution زندگی می‌کند؛ Kernel صریحاً این را «نه دارایی انحصاری» این Capability می‌داند (Kernel بخش ۱۴؛ Capability Map §2.8 Extension Points). بنابراین این State را نمی‌توان به‌عنوان State اختصاصی این Capability فهرست کرد.

---

## Public Interface

**Illustrative only. Kernel defines behaviour, not callable APIs.** موارد زیر تصویری از عملیات منطقی این Capability‌اند که از Responsibilities/Workflow تعریف‌شده در Kernel استخراج شده‌اند؛ Kernel هیچ API، امضای تابع، یا قرارداد فراخوانی مشخصی تعریف نمی‌کند.

- **Produce External Event** — تولید Event نوع Occurrence/Amendment/Retraction با `producer_type: external` (Kernel بخش ۴، ۶).
- **Publish Connector Health** — اعلام وضعیت سلامت Connector (Kernel بخش ۱۴، ۱۶).

**تصریح:** «Write To External System» عمداً در این فهرست نیامده — نوشتن روی سیستم بیرونی صراحتاً ممنوع است (Kernel بخش ۱۴؛ Non-Responsibilities). «Decide Admission» / «Evaluate Validity» نیز عمداً نیامده — تصمیم اعتبار Business Event، وظیفه‌ی انحصاری Domain Adaptation & Semantic Translation است (Kernel بخش ۷؛ AC-1؛ Non-Responsibilities).

---

## Internal Workflow

1. Connector، طبق Sync Strategy اعلام‌شده‌ی خودش (Polling/Webhook/CDC)، داده‌ی خام را از سیستم بیرونی دریافت می‌کند (Kernel بخش ۱۴).
2. این Capability داده‌ی خام را به Event کاندید (Occurrence/Amendment/Retraction) با `producer_type: external` تبدیل می‌کند (Kernel بخش ۴، ۶).
3. Idempotency Key Handler، کلید یکتاسازی ترکیبی را اعمال می‌کند تا از ثبت تکراری جلوگیری شود (Kernel بخش ۱۶).
4. Event کاندید برای بررسی Admission Policy به Domain Adaptation & Semantic Translation ارسال می‌شود؛ این Capability خودش تصمیم اعتبار نمی‌گیرد (Kernel بخش ۷؛ AC-1؛ Non-Responsibilities).
5. Connector Health Publisher به‌طور مستمر وضعیت سلامت Connector را منتشر می‌کند (Kernel بخش ۱۴، ۱۶).
6. در صورت شکست مکرر احراز هویت با منبع بیرونی، Retry/Circuit Breaker Handler مدار قطع را فعال می‌کند (Kernel بخش ۱۶).

مسیر دقیق پس از رد یک کاندید در Admission Policy (مرحله‌ی ۴) — **GAP — Not defined by Kernel** (Kernel بخش ۷ فقط می‌گوید کاندید رد شده «Business Event محسوب نمی‌شود»، بدون تعیین مسئولیت مسیر بعدی برای این Capability).

---

## Failure Modes

- **شکست Connector (Offline / Authentication Failed / Schema Changed):** انتشار از طریق وضعیت سلامت Connector (Kernel بخش ۱۴، ۱۶). رفتار دقیق این Capability پس از انتشار این وضعیت‌ها (مثلاً توقف Sync) — **GAP.**
- **شکست مکرر احراز هویت:** فعال‌سازی Circuit Breaker (Kernel بخش ۱۶). آستانه‌ی دقیق «مکرر» — **GAP.**
- **تحویل تکراری از Connector:** کلید یکتاسازی ترکیبی از ثبت دوباره جلوگیری می‌کند (Kernel بخش ۱۶).
- **رد Event در Admission Policy:** Event به‌عنوان Business Event محسوب نمی‌شود (Kernel بخش ۷). رفتار دقیق این Capability پس از رد — **GAP.**

---

## Extension Points

تعریف Connector؛ رجیستری، Sync Strategy، نسخه‌بندی schema، سلامت — زیرساخت مشترک با Action & Execution، نه دارایی انحصاری این Capability (Kernel بخش ۱۴، ۲۰؛ Capability Map §2.8).

---

## Dependencies

**Domain Adaptation & Semantic Translation** — Admission Policy (Kernel بخش ۷؛ AC-1؛ Capability Map §2.8).

---

## Known Gaps

- **Events Consumed** — کاملاً GAP؛ ورودی این Capability داده‌ی خام است، نه Event (Capability Map §2.8، صریح).
- **ساختار دقیق داده‌ی خام ورودی** — تعریف نشده.
- **State اختصاصی این Capability** — تعریف نشده؛ آنچه هست (رجیستری/سلامت) زیرساخت مشترکه، نه مالکیت انحصاری این Capability.
- **مسیر دقیق پس از رد Admission** — مسئولیت این Capability در این مسیر تعریف نشده.
- **آستانه‌ی «شکست مکرر» برای Circuit Breaker** — مقدار عددی تعریف نشده.
- **رابطه‌ی حذف رکورد در منبع بیرونی با Retraction** — Kernel هیچ‌جا صریحاً نمی‌گوید حذف یک رکورد در سیستم بیرونی باید توسط این Capability به‌شکل Event نوع Retraction ثبت شود؛ Retraction فقط به‌عنوان یک نوع عمومی Event تعریف شده (Kernel بخش ۴، ۷؛ INV-1)، بدون انتساب این سناریوی خاص به این Capability.
- **ماژول‌های داخلی فراتر از چهار مورد فهرست‌شده** — تعریف نشده.

---

## Engineering Notes

- انتخاب فناوری/SDK خاص برای اتصال به هر نوع سیستم بیرونی (تقویم، POS، اکسل و غیره) یک تصمیم پیاده‌سازی است و خارج از دامنه‌ی Kernel قرار دارد (Kernel بخش ۲۱: تصمیم‌های زیرساخت/میزبانی و انتخاب مدل/الگوریتم خاص، عدم‌هدف صریح هستند).
- الگوریتم دقیق تولید کلید یکتاسازی ترکیبی (Idempotency Key) یک جزئیات پیاده‌سازی است؛ Kernel فقط الزام وجود چنین کلیدی را وضع کرده، نه ساختار دقیقش (بخش ۱۶).
- از آنجا که رجیستری Connector و وضعیت سلامت، زیرساخت مشترک با Action & Execution است (بخش ۱۴)، قرارداد دقیق فنی این اشتراک (فرمت پیام، پروتکل انتشار سلامت) باید در یک Interaction Contract جداگانه تعریف شود، نه در این سند.
