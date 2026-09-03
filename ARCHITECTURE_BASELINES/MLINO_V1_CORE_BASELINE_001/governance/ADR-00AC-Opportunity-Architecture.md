# ADR-00AC: معماری Opportunity

**Status:** Accepted
**Scope:** Additive Architecture Layer (V1)
**Kernel Impact:** No Kernel Revision Required (fits existing Event/Projection primitives)
**Relation:** Applies to Kernel Architecture Specification v1.3

**Governance Status:** Approved / Frozen (فاز ۳D)
**Owners:** Product / Architecture Review
**Decision Category:** Core V1 Architecture / Opportunity Representation
**Supersedes:** None
**Promoted from:** `ADR_Candidate_Opportunity_Architecture.md` (فاز ۳B) → `ADR_Candidate_Opportunity_Architecture_v2.md` (فاز ۳C، پس از بازبینی تخاصمی)
**Superseded by:** None

---

## زمینه (Context)

MLINO V1 نیازمند نمایش معماری برای «Opportunity» — یک مفهوم محصولی جدید («موقعیتی که دیده‌شدنش توسط انسان مناسب، در زمان مناسب، می‌تواند نتیجه‌ی سازمانی بهتری ایجاد کند») — است که در هیچ‌کجای Kernel v1.2، Capability Map، یا Interaction Contracts پیشین تعریف نشده بود (PA-01).

## مسئله (Problem)

سه گزینه‌ی معماری برای نمایش Opportunity ممکن بود: نوع جدید موجودیت Core، Capability جدید، یا مصنوع Event-Sourced.

## محدودیت‌ها (Constraints)

ADR تأیید‌شده‌ی Core Entity Types فقط `Individual`/`Interaction` را مجاز می‌داند. Kernel §۲۰ افزودن Capability جدید را مشروط به عبور از «تست مسئولیت یکتا + عدم هم‌پوشانی» می‌کند.

## گزینه‌ها (Options)

۱) موجودیت Core جدید — در تضاد مستقیم با ADR منجمد Core Entity Types. ۲) Capability دوازدهم — نقض تست تک‌مسئولیتی، ریسک تمرکز‌گرایی. ۳) مصنوع Event-Sourced، هم‌الگو با Decision/Consent موجود.

## تصمیم (Decision)

Opportunity یک **مصنوع Event-Sourced** است — نوع Event با الگوی Occurrence/Amendment/Retraction (Kernel §۴)، نه موجودیت Core، نه Capability. مالکیت ذخیره‌سازی/Projection انحصاراً با Capability «حافظه و دانش» (بدون تغییر §۸).

**هویت (اصلاح فاز ۳C):** چهار مفهوم مجزا — `id` (هویت Event)، `opportunity_correlation_id` (= `id` رویداد Occurrence بنیان‌گذار، پایدار در طول چرخه‌ی عمر)، `unique_key` (فقط Idempotency)، هش محتوا (نسخه، مختص هر رویداد).

## گزینه‌های رد‌شده (Rejected Alternatives)

موجودیت Core جدید و Capability جدید — هر دو به دلایل بالا رد شدند؛ جزئیات کامل استدلال در سند مبدأ محفوظ است.

## پیامدها (Consequences)

استفاده‌ی کامل از زیرساخت موجود؛ سربار Event برای تغییرات جزئی چرخه‌ی عمر (پذیرفته‌شده در ازای Explainability کامل).

## اثر بر اقتدار (Authority Impact)

هیچ Capability موجود اقتدار جدید نمی‌گیرد یا از دست نمی‌دهد.

## اثر بر مالکیت (Ownership Impact)

مالکیت Event Log/Projection بدون تغییر (Capability «حافظه و دانش»). اعتبارسنجی محدود کاندیدا با Capability «انطباق دامنه» (تصریح، نه گسترش).

## اثر بر Interaction Contract

IC-13 (جدید).

## اثر بر Migration

بدون اثر بر Migration Plan یا کد Malino.

## مرز V1/V2

منحصراً V1؛ فضای نام `opportunity.*` از مفاهیم V2 مجزا.

## پرسش‌های باز باقی‌مانده (Open Questions)

سیاست فشرده‌سازی بلندمدت Projectionهای Opportunity منقضی‌شده — سطح پیاده‌سازی، غیرمسدودکننده.

---

**تاریخچه‌ی کامل تصمیم، گزینه‌های بررسی‌شده، و بازبینی تخاصمی در بایگانی معماری محفوظ است:** `ADR_Candidate_Opportunity_Architecture.md`، `ADR_Candidate_Opportunity_Architecture_v2.md`، `MLINO_PHASE_3B_FINAL_APPROVAL_REVIEW.md`.
