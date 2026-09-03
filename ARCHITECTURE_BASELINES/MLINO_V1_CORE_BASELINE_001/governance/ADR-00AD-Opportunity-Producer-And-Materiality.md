# ADR-00AD: تولیدکننده‌ی Opportunity و Materiality

**Status:** Accepted
**Scope:** Additive Architecture Layer (V1) + Narrow Kernel Amendment
**Kernel Impact:** Kernel v1.3 Amendment Applied (§6, §20 — پیوست ۴)
**Relation:** Applies to Kernel Architecture Specification v1.3

**Governance Status:** Approved / Frozen (فاز ۳D)
**Owners:** Product / Architecture Review
**Decision Category:** Core V1 Architecture / Event Producer Model
**Supersedes:** None
**Promoted from:** `ADR_Candidate_Opportunity_Producer_And_Materiality.md` (فاز ۳B) → `ADR_Candidate_Opportunity_Producer_And_Materiality_v2.md` (فاز ۳C)
**Superseded by:** None

---

## زمینه (Context)

Kernel «پرچم Materiality» را به‌عنوان نمونه‌ی Event درون‌زا نام می‌برد (G3) اما هیچ Capability تولیدکننده‌ای برایش مشخص نمی‌کند. چهار خانواده‌ی V1 (ظرفیت، کنسلی/عدم‌حضور، پیگیری، بازیابی درآمد) هرکدام دانش دامنه‌ی متفاوتی نیاز دارند.

## مسئله (Problem)

کدام مؤلفه مجاز است این Eventهای درون‌زا را تولید کند، بدون گسترش اقتدار Capability موجود یا ایجاد یک «Opportunity AI» متمرکز؟

## محدودیت‌ها

هیچ Capability موجود مسئولیت «کشف الگوی قابل‌توجه از داده‌ی عملیاتی صنعت‌محور» را ندارد. Kernel §۲۰ (پیش از این الحاقیه) فهرست بسته‌ای از چهار مکانیزم توسعه داشت که هیچ‌کدام این نقش را پوشش نمی‌داد.

## گزینه‌ها

۱) گسترش صریح Capability «استدلال و تحلیل علّی». ۲) Capability جدید «تشخیص Opportunity». ۳) تشخیص در لایه‌ی Feature/Domain Pack، با اعتبارسنجی محدود توسط Capability موجود.

## تصمیم

هر Value Engine (ظرفیت، کنسلی/عدم‌حضور، پیگیری) نمونه‌ای از نقش Kernel-سطح **تولیدکننده‌ی سیگنال دامنه (Domain Signal Producer)** است — لایه‌ی Feature/Domain Pack، نه Capability جدید، نه بخشی از Reasoning. زنجیره: منطق تشخیص → Event Candidate → IC-13 → اعتبارسنجی محدود (Capability «انطباق دامنه») → ماندگاری (Capability «حافظه و دانش»، انحصاری). این نقش از طریق الحاقیه‌ی Kernel v1.3 (§۶، §۲۰) رسماً به‌رسمیت شناخته شده است.

**Materiality:** قرارداد مشترک قطعی (`materiality_score`/`materiality_basis`)، نه امتیازدهی LLM. **قابل‌مقایسه فقط درون یک خانواده** (`domain_tag` یکسان) — مقایسه‌ی سراسری صریحاً خارج از دامنه‌ی V1.

**بازیابی درآمد:** دو لایه — تجمیع خام (Capability «حافظه و دانش»، صنعت‌کور) + تفسیر پولی (لایه‌ی Feature، صنعت‌محور) — تا اصل ۱ Kernel («Kernel صنعت‌کور است») نقض نشود.

**ممنوعیت درگاه پشتی:** هیچ تولیدکننده‌ای بدون ثبت رسمی در رجیستری تولیدکننده مجاز به فراخوانی IC-13 نیست؛ `domain_tag` مجاز یک فهرست بسته است.

## گزینه‌های رد‌شده

گسترش Reasoning (نقض مرز Capability Map منجمد)؛ Capability جدید (نقض تست تک‌مسئولیتی).

## پیامدها

هر خانواده‌ی Opportunity آینده نیازمند ثبت رسمی یک تولیدکننده‌ی جدید است — هزینه‌ی کوچک برای جلوگیری از تکثیر کنترل‌نشده.

## اثر بر اقتدار

Capability «انطباق دامنه» یک مسئولیت تصریح‌شده (نه گسترش‌یافته) برای اعتبارسنجی محدود کاندیدا می‌گیرد.

## اثر بر مالکیت

بدون تغییر در مالکیت Event Log/Projection.

## اثر بر Interaction Contract

IC-13 (جدید، شامل هر دو نوع تولیدکننده: Value Engine و رکورد تعامل انسانی).

## اثر بر Migration

بدون اثر.

## مرز V1/V2

منحصراً V1.

## پرسش‌های باز باقی‌مانده

سیاست دقیق «چه زمانی یک Value Engine باید یک Opportunity موجود را Amend کند» — سطح پیاده‌سازی، غیرمسدودکننده و به‌طور صریح ثبت‌شده در رجیستری گپ پس از انجماد.

---

**تاریخچه‌ی کامل و بازبینی تخاصمی محفوظ است:** `ADR_Candidate_Opportunity_Producer_And_Materiality.md`، `ADR_Candidate_Opportunity_Producer_And_Materiality_v2.md`، `MLINO_KERNEL_MINIMAL_AMENDMENT_VALUE_ENGINE_PRODUCERS.md`، `MLINO_PHASE_3B_FINAL_APPROVAL_REVIEW.md`.
