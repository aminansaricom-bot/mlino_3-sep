# Capability Specification — Domain Adaptation & Semantic Translation

## Status
Frozen v1.0

---

## Purpose
نگاشت هر Business Event به حداقل یک موجودیت Core (Kernel AC-1)؛ مجری انحصاری تفکیک هویت (Kernel بخش ۹) (Capability Map v1.0 §2.2).

---

## Responsibilities
- داوری Admission Policy: تعیین این‌که آیا یک Event کاندید، نگاشت معتبر به حداقل یک موجودیت Core می‌گیرد یا نه (Kernel AC-1؛ بخش ۷).
- تفکیک هویت (Identity Resolution) با دو آستانه‌ی اطمینان جداگانه: درون‌سازمانی و بین‌سازمانی؛ آستانه‌ی بین‌سازمانی به‌مراتب سخت‌گیرانه‌تر است، چون خطا یعنی اتصال دو پرونده‌ی واقعی متفاوت (Kernel بخش ۹).
- تولید Resolution Trace — کاندیدها، دلیل رد هرکدام، لایه‌ی منبع، نسخه — به‌عنوان الگوی مرجع استاندارد کل سیستم برای توضیح‌پذیری (Kernel بخش ۱۷).
- مصرف فهرست موجودیت‌های Core برای نگاشت؛ این فهرست یک مرجع سطح Kernel است، نه دارایی این Capability (Kernel بخش ۱۰، صریح).
- در صورت وجود چند کاندید معنایی هنگام ورود Event، حمل/نگهداری همه‌ی کاندیدها تا زمانی که Reasoning بعداً ابهام را حل کند (Kernel بخش ۷، پاراگراف «تصحیح تفکیک هویت پس از Admission»).

---

## Non Responsibilities
- حل ابهام با منطق کسب‌وکار — به‌صراحت وظیفه‌ی Domain Adaptation نیست: «انطباق دامنه هرگز ابهام را خودش با منطق کسب‌وکار حل نمی‌کند» (Kernel بخش ۱۵؛ این وظیفه‌ی Reasoning & Causal Analysis است).
- مالکیت فهرست موجودیت‌های Core — این Capability فقط مصرف‌کننده است، نه مالک (Kernel بخش ۱۰).
- ثبت/نگهداری Event Log — این مسئولیت Memory & Knowledge است (Kernel بخش ۸؛ Capability Map §2.1).

---

## Inputs

**Events Consumed:** کاندیدهای Event پیش از پذیرش (Kernel بخش ۷؛ Capability Map §2.2).

فراتر از این توصیف عمومی («کاندید Event پیش از پذیرش»)، فرمت دقیق ورودی، منبع دقیق آن (Connector مشخص در مقابل فرآیند درونی)، یا شمای داده‌ای آن در Kernel مشخص نشده:

**GAP — Not defined by Kernel.**

---

## Outputs

**Events Produced:**

**GAP — Not defined by Kernel.**

Capability Map §2.2 صراحتاً می‌گوید: «تصمیم Admission یک دروازه (Gate) است، نه یک Event نام‌گذاری‌شده؛ Kernel این Capability را در فهرست تولیدکننده‌های درون‌زای بخش ۶ نام نمی‌برد.» این دقیقاً بند G5 در فهرست GAP‌های Capability Map (§5) است.

**Non-Event Outputs:**
- **نتیجه‌ی Admission (Gate Outcome):** عبور Event به سمت ثبت در Event Log، یا رد و ارجاع به مسیر Observability خارج از Kernel (Kernel بخش ۷).
- **ارجاع به موجودیت(های) Core:** بخشی از ساختار الزامی هر Event که این Capability تولید می‌کند — «ارجاع به موجودیت(های) Core (پس از عبور از Domain Adaptation)» (Kernel بخش ۴).
- **Resolution Trace:** کاندیدها، دلیل رد هرکدام، لایه‌ی منبع، نسخه — الگوی مرجعی که کل سیستم (نه فقط این Capability) از آن استفاده‌ی مجدد می‌کند، اما ساختار مرجعش اینجا طراحی شده است (Kernel بخش ۱۷).

---

## Owned Concepts
- داوری Admission (Kernel AC-1).
- مکانیزم تفکیک هویت (Kernel بخش ۹).
- الگوی مرجع Resolution Trace (Kernel بخش ۱۷).

**تصریح عدم مالکیت:** فهرست موجودیت‌های Core مالکیت این Capability نیست؛ طبق Kernel بخش ۱۰ این فهرست «مرجعی در سطح Kernel» است که این Capability فقط برای نگاشت مصرف می‌کند، نه مالک آن است (مالکیت میزبانی آن با Memory & Knowledge است، طبق §2.1).

---

## Internal Modules

این ماژول‌ها پیاده‌سازی منطقی داخل همین Capability‌اند؛ هیچ‌کدام Capability جدید نیستند و هیچ مرز مسئولیتی را تغییر نمی‌دهند.

- **Admission Policy Adjudicator** — تعیین عبور/رد یک Event کاندید بر اساس وجود نگاشت معتبر به حداقل یک موجودیت Core؛ رد به معنای عدم شمول به‌عنوان Business Event است (AC-1، بخش ۷).
- **Identity Resolution Engine** — تفکیک هویت تحت دو آستانه‌ی اطمینان جداگانه (درون‌سازمانی / بین‌سازمانی) (بخش ۹). مقدار دقیق آستانه‌ها: GAP — Not defined by Kernel.
- **Core Entity Reference Consumer** — مصرف فهرست موجودیت‌های Core (مرجع سطح Kernel، میزبانی‌شده توسط Memory & Knowledge) صرفاً برای نگاشت، بدون مالکیت آن (بخش ۱۰).
- **Resolution Trace Builder** — تولید مصنوع Resolution Trace طبق الگوی مرجع کل سیستم: کاندیدها + دلیل رد هرکدام + لایه‌ی منبع + نسخه (بخش ۱۷).
- **Multi-Candidate Carrier** — در صورت باقی‌ماندن چند کاندید معنایی در لحظه‌ی Admission، حمل/نگهداری همه‌ی آن‌ها تا لحظه‌ای که Reasoning ابهام را حل کند (بخش ۷). مکانیزم دقیق نگهداری: GAP — Not defined by Kernel.

---

## State

Kernel ساختار داخلی State این Capability را تعریف نمی‌کند (برخلاف Memory & Knowledge که Event Log/Projection صریحاً برایش تعریف شده است).

- **مدل دو-آستانه‌ای تفکیک هویت** (درون‌سازمانی/بین‌سازمانی) به‌عنوان یک قاعده در Kernel بخش ۹ وجود دارد، اما مقدار عددی آستانه‌ها و مکانیزم نگهداری/پیکربندی آن‌ها: **GAP — Not defined by Kernel.**
- **مجموعه‌ی کاندیدهای معنایی معلق** (پیش از حل ابهام توسط Reasoning): وجودشان از بخش ۷ استنباط می‌شود، اما محل و شکل نگهداری آن‌ها تا لحظه‌ی حل ابهام: **GAP — Not defined by Kernel.**

---

## Public Interface

**Illustrative only. Kernel defines behaviour, not callable APIs.** موارد زیر تصویری از عملیات منطقی این Capability‌اند که از Responsibilities/Workflow تعریف‌شده در Kernel استخراج شده‌اند؛ Kernel هیچ API، امضای تابع، یا قرارداد فراخوانی مشخصی تعریف نمی‌کند.

- **Evaluate Admission** — بررسی و تصمیم‌گیری درباره‌ی عبور/رد یک Event کاندید بر اساس وجود نگاشت معتبر به حداقل یک موجودیت Core (AC-1، بخش ۷).
- **Resolve Identity** — انجام تفکیک هویت تحت آستانه‌ی درون‌سازمانی یا بین‌سازمانی، بسته به زمینه (بخش ۹).
- **Build Resolution Trace** — تولید مصنوع Resolution Trace طبق الگوی مرجع سیستم (بخش ۱۷).

**تصریح:** «Resolve Ambiguity» عمداً در این فهرست نیامده — حل نهایی ابهام میان کاندیدها، وظیفه‌ی انحصاری Reasoning & Causal Analysis است، نه این Capability (بخش ۱۵؛ Capability Map §2.2 Non-Responsibilities).

---

## Internal Workflow

1. یک Event کاندید، پیش از پذیرش، به این Capability می‌رسد (بخش ۷).
2. Admission Policy Adjudicator بررسی می‌کند که آیا نگاشت معتبر به حداقل یک موجودیت Core برای این Event ممکن است (AC-1).
3. اگر نگاشت معتبر ممکن نباشد → Event به‌عنوان Business Event محسوب نمی‌شود و به مسیر Observability خارج از Kernel هدایت می‌شود (بخش ۷؛ AC-1). جزئیات دقیق این مسیر: GAP — Not defined by Kernel.
4. اگر نگاشت ممکن باشد، Identity Resolution Engine تفکیک هویت را با آستانه‌ی متناسب (درون‌سازمانی یا بین‌سازمانی) انجام می‌دهد (بخش ۹).
5. در این مرحله ممکن است بیش از یک کاندید معنایی باقی بماند؛ همه‌ی کاندیدها حفظ می‌شوند، نه فقط یکی به‌صورت قطعی انتخاب‌شده (بخش ۷).
6. Resolution Trace Builder، کاندیدها، دلیل رد هرکدام، لایه‌ی منبع و نسخه را طبق الگوی مرجع بخش ۱۷ ثبت می‌کند.
7. Event به همراه ارجاع موجودیت(های) Core و — در صورت ابهام — مجموعه‌ی کاندیدها و Resolution Trace، برای ثبت در Event Log به Memory & Knowledge منتقل می‌شود (بخش ۴، ۷، ۸).
8. اگر بعداً Reasoning & Causal Analysis ابهام را حل کند، این تصحیح هرگز ویرایش مستقیم Event اصلی نیست (طبق INV-1)؛ بلکه یک Event مستقل از نوع Amendment است که به Event اصلی ارجاع می‌دهد و نگاشت نهایی را حمل می‌کند. این Amendment توسط Reasoning ثبت می‌شود، نه توسط Domain Adaptation (بخش ۷، ۱۵).

---

## Failure Modes

- **عدم وجود نگاشت معتبر به موجودیت Core:** طبق AC-1، Event به‌عنوان Business Event محسوب نمی‌شود؛ مسیر Observability خارج از Kernel فعال می‌شود (بخش ۷). جزئیات دقیق رفتار مسیر Observability: **GAP — Not defined by Kernel.**
- **ابهام هویتی حل‌نشده در لحظه‌ی Admission:** چند کاندید معنایی حفظ می‌شود تا Reasoning بعداً تصمیم بگیرد؛ تصحیح نهایی همیشه به‌شکل Amendment مستقل ثبت می‌شود، هرگز ویرایش مستقیم (بخش ۷، طبق INV-1).
- **خطای تفکیک هویت بین‌سازمانی:** Kernel فقط الزام می‌کند که آستانه‌ی بین‌سازمانی سخت‌گیرانه‌تر از درون‌سازمانی باشد (بخش ۹)؛ مقدار دقیق آستانه، نرخ خطای قابل‌قبول، یا رویه‌ی جبران پس از خطا: **GAP — Not defined by Kernel.**

---

## Extension Points
لایه‌ی واژگان (Domain/Organization)، Attribute Pack، Relationship Type Registry (Kernel بخش ۲۰؛ Capability Map §2.2) — این‌ها نقاط توسعه‌ی عمومی سطح Kernel هستند، مصرف‌شده توسط چند Capability؛ نقطه‌ی توسعه‌ی اختصاصی و انحصاری این Capability در Kernel تعریف نشده است.

---

## Dependencies

**GAP — Not defined by Kernel.**

Capability Map §2.2 و §3 (ماتریس وابستگی) هر دو صراحتاً می‌گویند: «وابستگی صریح این Capability به Capability دیگری در متن Kernel نیامده» — این دقیقاً بند G7 در فهرست GAP‌های Capability Map (§5) است.

**تمایز مهم:** Kernel بخش ۱۰ می‌گوید این Capability فهرست موجودیت‌های Core را مصرف می‌کند، اما این یک وابستگی به یک «مرجع سطح Kernel» است (که هر دو، هم Memory & Knowledge و هم Domain Adaptation، صرفاً مصرف‌کننده‌ی آن‌اند)، نه یک وابستگی رسمی به یک Capability دیگر. به همین دلیل در ماتریس وابستگی Capability Map هم به‌درستی GAP علامت خورده، نه ارجاع به Memory & Knowledge.

---

## Known Gaps
- نام‌گذاری دقیق مصنوع/Event خروجی تصمیم Admission (G5، Capability Map §5).
- Dependencies صریح این Capability به یک Capability دیگر (G7، Capability Map §5).
- فرمت و شمای دقیق داده‌ای «کاندید Event پیش از پذیرش» (ورودی این Capability).
- مقدار عددی/مکانیزم دقیق دو آستانه‌ی اطمینان تفکیک هویت (درون‌سازمانی/بین‌سازمانی).
- جزئیات دقیق مسیر «Observability» برای Eventهای ردشده (فقط گفته شده «خارج از Kernel» است).
- مکانیزم دقیق نگهداری/حمل چند کاندید معنایی معلق تا لحظه‌ی حل ابهام توسط Reasoning.

---

## Engineering Notes
- از آنجا که خروجی این Capability (ارجاع به موجودیت Core) پیش‌نیاز ثبت هر Event در Memory & Knowledge است (بخش ۴، ۹)، این Capability عملاً در مسیر بحرانی (Critical Path) هر Event ورودی قرار دارد؛ انتخاب فناوری یا معماری اجرای آن، تصمیم زیرساختی است و طبق بخش ۲۱ خارج از دامنه‌ی Kernel و این سند است.
- از آنجا که Resolution Trace به‌صراحت الگوی مرجع کل سیستم اعلام شده (بخش ۱۷: «تکرار نشود، استفاده‌ی مجدد شود»)، ساختار دقیق این مصنوع و نحوه‌ی استفاده‌ی مجدد سایر Capabilityها (Reasoning، Decision Support، Communication) از آن، تصمیم پیاده‌سازی است و خارج از دامنه‌ی Kernel قرار دارد.
- از آنجا که نگهداری چند کاندید معلق تا حل نهایی توسط Reasoning یک الزام رفتاری صریح است (بخش ۷)، اما مکانیزم نگهداری GAP است، محل و شکل نگهداری این کاندیدها — تصمیمات پیاده‌سازی خارج از دامنه‌ی Kernel است.
