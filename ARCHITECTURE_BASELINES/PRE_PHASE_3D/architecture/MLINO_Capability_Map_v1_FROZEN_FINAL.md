# Capability Map v1.0 (Frozen)

**یادداشت نسخه:** خودِ این سند هنوز v1.0 است و تغییری نکرده. ارجاعش به «Kernel Architecture Specification v1.2» فقط برای انطباق با شماره‌ی نسخه‌ی فعلی Kernel به‌روزرسانی شده؛ v1.1 و v1.2 هر دو رسماً با تمام محتوای این سند سازگار تأیید شده‌اند (رجوع به پیوست ۲ و ۳ در سند Kernel).

**وضعیت:** Frozen. **منبع حقیقت:** Kernel Architecture Specification v1.2 (Frozen). این سند تحکیم مسئولیت‌های از پیش تعریف‌شده در Kernel به یازده Capability است. هیچ قانون معماری جدیدی معرفی نشده، هیچ Capability ایجاد/ادغام/تفکیک نشده، و هیچ مرز Capability جابه‌جا نشده. هر جا Kernel چیزی صراحتاً تعریف نکرده، فیلد **GAP** علامت خورده است و باید تا فاز Capability Specification به همین شکل باقی بماند.

---

## ۱. خلاصه‌ی مدیریتی (Executive Summary)

این سند یازده Capability را که رفتار مشترک‌شان توسط Kernel Architecture Specification v1.2 اداره می‌شود، مستند می‌کند. هر Capability از هشت بُعد بررسی شده: Purpose، Responsibilities، Owned Concepts، Events Produced، Events Consumed، Dependencies، Non-Responsibilities، Extension Points. هر بند غیر-GAP به یک بخش یا کد مشخص از Kernel (مثلاً INV-1، AC-4، بخش ۱۵) ارجاع می‌دهد؛ هیچ بندی بدون ارجاع باقی نمانده است.

از یازده Capability، نه Capability دارای محتوای مستقیم در Kernel هستند. دو Capability — **Prediction & Simulation** و **Goal Alignment & Strategy** — طبق تصمیم صریح پروژه Deferred‌اند و عمداً بدون طراحی باقی مانده‌اند؛ Kernel نیز عملاً محتوایی برای آن‌ها تعریف نکرده است.

شش GAP سراسری (رجوع به بخش ۵) در سطح Kernel باقی می‌مانند و باید در فاز Capability Specification پیگیری شوند؛ هیچ‌کدام مانع Freeze این سند نیستند، چون همگی از نوع سکوت واقعی Kernel‌اند، نه نقص در تحکیم این نقشه.

---

## ۲. تعریف یازده Capability

### ۲.۱ Memory & Knowledge

**Purpose:** نگهداری Event Log به‌عنوان منبع حقیقت و تولید Projection مشتق‌شده (بخش ۸).

**Responsibilities:** نگهداری Event Log تغییرناپذیر (INV-1/INV-2، بخش ۳، ۴)؛ پیاده‌سازی ساختار Event (بخش ۴، «مسئولیت پیاده‌سازی: Capability «حافظه و دانش»»)؛ تولید/ابطال Projection تحت Eventual Consistency (بخش ۸)؛ اعمال Temporal Decay فقط روی Projection، هرگز روی Event Log (بخش ۸)؛ میزبانی Subsystem بین‌سازمانی (بخش ۱۰)؛ ثبت `kernel_version` روی هر Event (بخش ۴، ۱۹).

**Owned Concepts:** Event Log؛ چرخه‌ی عمر Projection («هیچ Capability دیگری خودش Projection موازی نمی‌سازد»، بخش ۸)؛ میزبانی Subsystem بین‌سازمانی (بخش ۱۰). فهرست موجودیت‌های Core مالکیت این Capability نیست — بخش ۱۰ آن را «مرجعی در سطح Kernel» می‌داند که Memory & Knowledge فقط برای ذخیره‌سازی مصرف می‌کند.

**Events Produced:** None (صریح) برای فشرده‌سازی/Temporal Decay — بخش ۸: «حافظه و دانش از فشرده‌سازی هیچ Event جدیدی تولید نمی‌کند». فراتر از این مورد: GAP.

**Events Consumed:** Occurrence / Amendment / Retraction از هر منبع (بخش ۴، ۷).

**Dependencies:** Domain Adaptation & Semantic Translation (بخش ۴، ۹؛ Eventها پیش از ثبت باید ارجاع به موجودیت Core داشته باشند که محصول Domain Adaptation است).

**Non-Responsibilities:** تعیین معنای موجودیت (بخش ۹)؛ تصمیم دسترسی (AC-2)؛ تولید Event جدید از فشرده‌سازی (بخش ۸، صریح).

**Extension Points:** Attribute Pack، Relationship Type Registry (بخش ۲۰) — نقاط توسعه‌ی عمومی سطح Kernel، مصرف‌شده توسط چند Capability؛ نه دارایی انحصاری این Capability.

---

### ۲.۲ Domain Adaptation & Semantic Translation

**Purpose:** نگاشت هر Business Event به موجودیت Core (AC-1)؛ مجری انحصاری تفکیک هویت (بخش ۹).

**Responsibilities:** داوری Admission Policy (AC-1)؛ تفکیک هویت با آستانه‌ی درون/بین‌سازمانی متفاوت (بخش ۹)؛ تولید Resolution Trace به‌عنوان الگوی مرجع کل سیستم (بخش ۱۷)؛ مصرف فهرست موجودیت‌های Core برای نگاشت (بخش ۱۰، صریح).

**Owned Concepts:** داوری Admission (AC-1)؛ مکانیزم تفکیک هویت (بخش ۹)؛ الگوی مرجع Resolution Trace (بخش ۱۷).

**Events Produced:** GAP — تصمیم Admission یک دروازه (Gate) است، نه یک Event نام‌گذاری‌شده؛ Kernel این Capability را در فهرست تولیدکننده‌های درون‌زای بخش ۶ نام نمی‌برد.

**Events Consumed:** کاندیدهای Event پیش از پذیرش (بخش ۷).

**Dependencies:** GAP — وابستگی صریح این Capability به Capability دیگری در متن Kernel نیامده.

**Non-Responsibilities:** حل ابهام با منطق کسب‌وکاری — «انطباق دامنه هرگز ابهام را خودش با منطق کسب‌وکار حل نمی‌کند» (بخش ۱۵).

**Extension Points:** لایه‌ی واژگان (Domain/Organization)، Attribute Pack، Relationship Type Registry (بخش ۲۰).

---

### ۲.۳ Reasoning & Causal Analysis

**Purpose:** انتخاب نهایی از میان کاندیدهای معنایی Domain Adaptation؛ مصرف Projection (بخش ۱۵، ۷، ۸).

**Responsibilities:** انتخاب کاندید نهایی (بخش ۱۵)؛ ثبت تصحیح هویت پس از Admission به‌شکل Amendment (بخش ۷).

**Owned Concepts:** GAP — هیچ اقتدار انحصاری صریح در Kernel به این Capability نسبت داده نشده.

**Events Produced:** Amendment برای تصحیح تفکیک هویت (بخش ۷).

**Events Consumed:** GAP — فراتر از مصرف Projection (که خود یک Event نیست) مشخص نیست.

**Dependencies:** Domain Adaptation & Semantic Translation (بخش ۱۵).

**Non-Responsibilities:** تولید کاندید معنایی (بخش ۱۵، وظیفه‌ی Domain Adaptation).

**Extension Points:** GAP.

---

### ۲.۴ Prediction & Simulation (Deferred)

**Purpose:** GAP — تنها ارجاع، نام‌بردن «Prediction» در فهرست مصرف‌کننده‌های Projection است (بخش ۸).

**Responsibilities:** GAP.

**Owned Concepts:** GAP.

**Events Produced:** GAP.

**Events Consumed:** GAP.

**Dependencies:** Memory & Knowledge (استنباط از فهرست مصرف‌کننده‌ی Projection، بخش ۸).

**Non-Responsibilities:** GAP.

**Extension Points:** GAP.

---

### ۲.۵ Goal Alignment & Strategy (Deferred)

**Purpose:** GAP — هیچ ارجاع مستقیم یا غیرمستقیمی در هیچ‌یک از ۲۲ بخش Kernel Specification یافت نشد.

**Responsibilities:** GAP.

**Owned Concepts:** GAP.

**Events Produced:** GAP.

**Events Consumed:** GAP.

**Dependencies:** GAP.

**Non-Responsibilities:** GAP.

**Extension Points:** GAP.

---

### ۲.۶ Decision Support & Recommendation

**Purpose:** تولید تصمیم/پیشنهاد دارای شناسه‌ی قابل‌ارجاع، مشروط به عبور از خودانتقادی حاکمیت (بخش ۱۵).

**Responsibilities:** مصرف سرویس خودانتقادی حاکمیت پیش از نهایی‌سازی (بخش ۱۵)؛ تولید مصنوع Decision/Recommendation که Action & Execution از طریق `decision_id` به آن ارجاع می‌دهد (AC-4).

**Owned Concepts:** مصنوع Decision/Recommendation قابل‌ارجاع (AC-4، بخش ۱۵).

**Events Produced:** GAP — نام دقیق Event تعریف نشده؛ فقط الزام شناسه‌ی قابل‌ارجاع صریح است (AC-4).

**Events Consumed:** GAP.

**Dependencies:** Trust, Explainability & Governance (بخش ۱۵، سرویس خودانتقادی).

**Non-Responsibilities:** اجرای منطق خودانتقادی (بخش ۱۵، سرویس عرضی نزد حاکمیت)؛ اجرای اقدام (AC-4، وظیفه‌ی Action & Execution).

**Extension Points:** GAP.

---

### ۲.۷ Communication & Narrative

**Purpose:** GAP جزئی — Kernel نقش کلی این Capability را تعریف نمی‌کند، فقط یک قید صریح دارد (بخش ۱۵، بخش ۲).

**Responsibilities:** GAP — تنها مسئولیت صریح، در واقع یک محدودیت است (رجوع به Non-Responsibilities).

**Owned Concepts:** GAP.

**Events Produced:** GAP.

**Events Consumed:** GAP.

**Dependencies:** Trust, Explainability & Governance (بخش ۱۵؛ مجوز دسترسی برای آنچه مجاز به بیان است).

**Non-Responsibilities:** «روایت هرگز محتوایی را که درخواست‌کننده مجاز به دیدنش نیست، بیان نمی‌کند» (بخش ۱۵)؛ «روایت نمی‌تواند خودش درباره‌ی مجوز دسترسی تصمیم بگیرد» (بخش ۲، اصل ۷).

**Extension Points:** GAP.

---

### ۲.۸ Data Ingestion & Integration

**Purpose:** مسیر انحصاری تولید Eventهای برون‌زا از طریق Connector (بخش ۶).

**Responsibilities:** تولید Event با `producer_type: external` (بخش ۶)؛ Idempotency عملیات جذب با کلید یکتاسازی ترکیبی (بخش ۱۶)؛ Retry با backoff برای Connectorهای بیرونی و فعال‌سازی Circuit Breaker در صورت شکست مکرر احراز هویت (بخش ۱۶)؛ عدم سکوت در برابر کهنگی داده — انتشار از طریق وضعیت سلامت Connector (بخش ۱۶)؛ هرگز به سیستم بیرونی نمی‌نویسد (بخش ۱۴).

**Owned Concepts:** مسیر تولید Event برون‌زا — «برون‌زا: از طریق Connectorها، تحت Capability «جذب و یکپارچه‌سازی داده»» (بخش ۶).

**Events Produced:** Occurrence / Amendment / Retraction با `producer_type: external` (بخش ۴، ۶).

**Events Consumed:** GAP — ورودی این Capability داده‌ی خام از سیستم‌های بیرونی است، نه Event به‌شکل نهایی؛ Kernel این ورودی را «Event مصرفی» نمی‌نامد.

**Dependencies:** Domain Adaptation & Semantic Translation (بخش ۷، Admission Policy).

**Non-Responsibilities:** نوشتن روی سیستم بیرونی (بخش ۱۴، صریح)؛ تصمیم اعتبار Business Event (بخش ۷، وظیفه‌ی Domain Adaptation).

**Extension Points:** تعریف Connector؛ رجیستری، Sync Strategy، نسخه‌بندی schema، سلامت — زیرساخت مشترک با Action & Execution، نه دارایی انحصاری این Capability (بخش ۱۴).

---

### ۲.۹ Action & Execution

**Purpose:** اجرای اقدام مجاز روی دنیای بیرون، با ارجاع اجباری به تصمیم (AC-4) و مالکیت انحصاری تصمیم ریسک نوشتن (بخش ۱۴).

**Responsibilities:** حمل `decision_id` قابل‌ردیابی به یک مصنوع Decision/Recommendation موجود (AC-4)؛ Idempotency اجرا با کلید یکتاسازی ترکیبی (بخش ۱۶)؛ Retry با backoff و Circuit Breaker روی Connectorهای بیرونی، در صورت شکست مکرر احراز هویت (بخش ۱۶، مشترک با بخش ۱۴)؛ عدم سکوت در برابر کهنگی داده از طریق وضعیت سلامت Connector (بخش ۱۶)؛ تصمیم‌گیری درباره‌ی مجاز بودن نوشتن (بخش ۱۴)؛ هرگز به‌عنوان وظیفه‌ی اصلی از سیستم بیرونی نمی‌خواند (بخش ۱۴).

**Owned Concepts:** تصمیم ریسک نوشتن — «تصمیم‌های ریسک... مختص Capability «اجرا و اقدام» است» (بخش ۱۴)؛ الزام حمل `decision_id` در هر اقدام خودکار (AC-4) — مجزا از مالکیت خودِ مصنوع تصمیم، که متعلق به Decision Support است.

**Events Produced:** GAP — نام دقیق Event نتیجه‌ی اقدام تعریف نشده.

**Events Consumed:** GAP.

**Dependencies:** Decision Support & Recommendation (AC-4).

**Non-Responsibilities:** خواندن/جذب وضعیت بیرونی به‌عنوان وظیفه‌ی اصلی (بخش ۱۴، صریح)؛ تعیین محتوای اقدام (استنباط از AC-4، محتوا از Decision Support می‌آید).

**Extension Points:** تعریف Connector، حالت نوشتن — زیرساخت مشترک با Data Ingestion (بخش ۱۴).

---

### ۲.۱۰ Learning & Feedback

**Purpose:** تولید Event مقایسه‌ی نتیجه در چرخه‌ی تأخیری (بخش ۶)؛ واکنش به اجرای حق فراموشی روی مدل‌های مشتق‌شده (بخش ۱۳).

**Responsibilities:** تولید Event درون‌زای مقایسه‌ی نتیجه (بخش ۶)؛ پرچم‌گذاری بازبینی مدل‌های مشتق‌شده پس از حق فراموشی — «یادگیری: مدل‌های مشتق‌شده پرچم بازبینی می‌خورند» (بخش ۱۳).

**Owned Concepts:** GAP.

**Events Produced:** Event درون‌زای مقایسه‌ی نتیجه، بدون نام دقیق در متن Kernel (بخش ۶).

**Events Consumed:** GAP — بخش ۱۳ محرک واکنش یادگیری را «هویت فراموش‌شده» (اجرای Right To Be Forgotten) می‌داند، نه رویداد `ConsentRevoked` بخش ۱۱؛ این دو مفهوم متفاوت‌اند و Kernel نام Event مشخصی برای محرک اجرای RTBF تعیین نکرده است.

**Dependencies:** Trust, Explainability & Governance (بخش ۱۳، مالک قرارداد حق فراموشی).

**Non-Responsibilities:** GAP.

**Extension Points:** GAP.

---

### ۲.۱۱ Trust, Explainability & Governance

**Purpose:** مرجع انحصاری تصمیم دسترسی (AC-2)؛ دارنده‌ی دسترسی ممتاز به Event Log خودش (AC-5).

**Responsibilities:** ارزیابی سیاست دسترسی (AC-2، بخش ۱۲)؛ کش تصمیم دسترسی در سطح جلسه برای جلوگیری از ارزیابی مکرر (بخش ۱۲)؛ عدم پذیرش نقطه‌ی توسعه‌ی صنعتی (بخش ۲۰)؛ تولید Eventهای رضایت (بخش ۱۱).

**Owned Concepts:** تصمیم دسترسی (AC-2)؛ دسترسی ممتاز به Event Log رضایت/دسترسی خودش (AC-5)؛ استثنای عدم‌توسعه‌پذیری (بخش ۲۰).

**Events Produced:** `ConsentGranted`، `ConsentRenewed`، `ConsentRevoked`، `ConsentExpired` (بخش ۱۱).

**Events Consumed:** GAP — فراتر از «وضعیت مالکیت/رضایت» (که خود به‌شکل Event مدل شده، بخش ۱۰، ۱۱، ۱۲) نام دقیق Event ورودی مشخص نیست.

**Dependencies:** Memory & Knowledge — «ارزیابی سیاست دسترسی، وابسته به خواندن Projection حافظه است» (بخش ۱۲، صریح).

**Non-Responsibilities:** سفارشی‌سازی صنعتی/سازمانی قوانین دسترسی، رضایت و مالکیت از طریق Domain Pack یا سطح سازمانی — «قوانین دسترسی، رضایت و مالکیت، مستقیماً توسط Kernel اجرا می‌شوند و نمی‌توانند از طریق Domain Pack یا سطح سازمانی سفارشی‌سازی شوند» (بخش ۲۰، صریح).

**Extension Points:** ندارد — استثنای صریح (بخش ۲۰).

---

## ۳. ماتریس وابستگی (Dependency Matrix)

| Capability | وابسته به | مبنای Kernel |
|---|---|---|
| ۱. Memory & Knowledge | Domain Adaptation & Semantic Translation | بخش ۴، ۹ |
| ۲. Domain Adaptation & Semantic Translation | GAP | — |
| ۳. Reasoning & Causal Analysis | Domain Adaptation & Semantic Translation | بخش ۱۵ |
| ۴. Prediction & Simulation | Memory & Knowledge | بخش ۸ (استنباط از فهرست مصرف‌کننده‌ی Projection) |
| ۵. Goal Alignment & Strategy | GAP | — |
| ۶. Decision Support & Recommendation | Trust, Explainability & Governance | بخش ۱۵ (سرویس خودانتقادی) |
| ۷. Communication & Narrative | Trust, Explainability & Governance | بخش ۱۵، بخش ۲ |
| ۸. Data Ingestion & Integration | Domain Adaptation & Semantic Translation | بخش ۷ (Admission Policy) |
| ۹. Action & Execution | Decision Support & Recommendation | AC-4 |
| ۱۰. Learning & Feedback | Trust, Explainability & Governance | بخش ۱۳ |
| ۱۱. Trust, Explainability & Governance | Memory & Knowledge | بخش ۱۲ (خواندن Projection) |

---

## ۴. ماتریس پوشش (Coverage Matrix): Kernel Section → Capability

| بخش Kernel | عنوان | Capability(های) مسئول |
|---|---|---|
| ۱ | هدف و دامنه | عمومی — سطح Kernel، مصرف‌شده توسط همه |
| ۲ | اصول معماری | عمومی — سطح Kernel، مصرف‌شده توسط همه |
| ۳ (INV) | Kernel Invariants | Memory & Knowledge (INV-1/2)؛ Trust/Governance (INV-4/5) |
| ۳ (AC) | Architectural Constraints | Domain Adaptation (AC-1)؛ Governance (AC-2، AC-5)؛ عمومی (AC-3)؛ Action & Execution + Decision Support (AC-4، مشترک) |
| ۴ | مدل جهانی Event | Memory & Knowledge (پیاده‌سازی)؛ همه (مصرف) |
| ۵ | مدل دوزمانی | Memory & Knowledge؛ Data Ingestion (منشأ ناهم‌زمانی) |
| ۶ | تولیدکننده‌های Event | Data Ingestion (برون‌زا)؛ Learning & Feedback، Trust/Governance (نمونه‌های درون‌زا)؛ پرچم Materiality بدون Capability تولیدکننده‌ی مشخص (رجوع به بخش ۵) |
| ۷ | چرخه‌ی حیات Event | Domain Adaptation (Admission)؛ Memory & Knowledge (ثبت)؛ Reasoning (Amendment اصلاحی) |
| ۸ | قوانین Event Sourcing | Memory & Knowledge |
| ۹ | مدل هویت | Domain Adaptation |
| ۱۰ | مدل مالکیت | Memory & Knowledge (میزبانی)؛ Trust/Governance (اجرای قانون مالکیت)؛ Domain Adaptation (مصرف فهرست موجودیت‌های Core برای نگاشت، صریح) |
| ۱۱ | مدل رضایت | Trust, Explainability & Governance |
| ۱۲ | مدل سیاست دسترسی | Trust, Explainability & Governance؛ Memory & Knowledge (وابستگی Projection) |
| ۱۳ | قرارداد حق فراموشی | Trust/Governance (مالک)؛ Learning & Feedback، Memory & Knowledge (واکنش‌دهنده) |
| ۱۴ | زیرساخت مشترک Connector | Data Ingestion & Integration؛ Action & Execution (مشترک، بدون تصمیم‌گیری مستقل خودِ لایه) |
| ۱۵ | قراردادهای بین‌Capabilityی | Reasoning، Domain Adaptation، Decision Support، Governance، Action & Execution، Communication & Narrative |
| ۱۶ | قوانین قابلیت‌اطمینان | Data Ingestion؛ Action & Execution (هر دو: Idempotency + Retry/Circuit Breaker + نمایان‌سازی کهنگی) |
| ۱۷ | قوانین توضیح‌پذیری | Domain Adaptation (الگوی مرجع)؛ همه (مصرف) |
| ۱۸ | اصول امنیتی | Trust, Explainability & Governance |
| ۱۹ | راهبرد نسخه‌بندی | عمومی — سطح Kernel؛ Memory & Knowledge (فیلد `kernel_version`) |
| ۲۰ | قوانین توسعه | Domain Adaptation؛ Data Ingestion؛ Action & Execution؛ Governance (استثنای عدم‌توسعه‌پذیری) |
| ۲۱ | عدم‌اهداف صریح | عمومی — سطح Kernel، مالک هیچ Capability نیست |
| ۲۲ | واژه‌نامه | عمومی — مرجع سطح Kernel |
| پیوست ۱ | AC-2 / AC-4 | Trust/Governance؛ Action & Execution + Decision Support |

**تأیید پوشش:** هر بخش Kernel حداقل توسط یک Capability مصرف یا مالک شده است. بخش‌های ۱، ۲، ۲۱، ۲۲ ذاتاً سطح Kernel هستند و به هیچ Capability خاصی تعلق ندارند.

---

## ۵. شکاف‌های باقی‌مانده‌ی Kernel (Remaining Kernel Gaps)

این شکاف‌ها به همین شکل GAP باقی می‌مانند و باید در فاز Capability Specification پیگیری شوند:

- **G1.** Prediction & Simulation — Deferred؛ Kernel محتوایی جز یک ارجاع غیرمستقیم در بخش ۸ تعریف نکرده.
- **G2.** Goal Alignment & Strategy — Deferred؛ هیچ ارجاعی در ۲۲ بخش Kernel یافت نشد.
- **G3.** پرچم Materiality (بخش ۶، ۲۲) — Kernel مفهوم را تعریف و آن را نمونه‌ای از Event درون‌زا می‌شمارد، اما هیچ Capability تولیدکننده‌ای برایش مشخص نمی‌کند.
- **G4.** محرک دقیق واکنش Learning & Feedback به اجرای RTBF (بخش ۱۳) — نام Event یا مکانیزم دقیقی که این Capability را از اجرای RTBF روی یک هویت خاص آگاه می‌کند، در Kernel نامگذاری نشده.
- **G5.** نام‌گذاری دقیق Eventهای: تصمیم Admission (Domain Adaptation)، نتیجه‌ی اقدام (Action & Execution)، مصنوع Decision/Recommendation (Decision Support) — Kernel فقط الزام ساختاری/ارجاعی وضع کرده، نه نام‌گذاری صریح.
- **G6.** Owned Concepts برای Reasoning، Learning & Feedback، و بخش زیادی از Communication & Narrative — Kernel اقتدار انحصاری صریحی تعریف نکرده.
- **G7.** Dependencies صریح برای Domain Adaptation & Semantic Translation و Goal Alignment & Strategy.

---

## ۶. بیانیه‌ی Freeze (Freeze Statement)

**Capability Map v1.0 — Frozen.**

این سند یازده Capability را با مرزهای بدون‌تغییر نسبت به نسخه‌ی پیشین مستند می‌کند؛ هیچ Capability ایجاد، ادغام، تفکیک یا جابه‌جا نشده است. هر بند غیر-GAP به یک بخش یا کد مشخص از Kernel Architecture Specification v1.2 ارجاع می‌دهد. شکاف‌های فهرست‌شده در بخش ۵ به‌عنوان سکوت واقعی Kernel — نه نقص در این نقشه — به‌صراحت باز می‌مانند و به فاز بعدی (Capability Specifications) منتقل می‌شوند.

**Capability Map Ready For Freeze: YES.**
