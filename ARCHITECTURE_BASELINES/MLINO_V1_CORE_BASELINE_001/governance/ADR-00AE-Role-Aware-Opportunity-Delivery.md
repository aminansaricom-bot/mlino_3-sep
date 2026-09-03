# ADR-00AE: تحویل نقش‌آگاه Opportunity

**Status:** Accepted
**Scope:** Additive Architecture Layer (V1)
**Kernel Impact:** No Kernel Revision Required
**Relation:** Applies to Kernel Architecture Specification v1.3

**Governance Status:** Approved / Frozen (فاز ۳D)
**Owners:** Product / Architecture Review
**Decision Category:** Core V1 Architecture / Delivery & Access Ordering
**Supersedes:** None
**Promoted from:** `ADR_Candidate_Role_Aware_Opportunity_Delivery.md` (فاز ۳B) → `ADR_Candidate_Role_Aware_Opportunity_Delivery_v2.md` (فاز ۳C)
**Superseded by:** None

---

## زمینه

نقش‌های راه‌اندازی V1 (Owner/Manager، Receptionist/Coordinator) نیاز به دریافت برداشت‌های متفاوت از یک Reality مشترک دارند، بدون تکثیر داده و بدون سیستم مجوز پیچیده.

## مسئله

چگونه «تناسب محتوا با نقش» را از «مجوز دسترسی امنیتی» مجزا نگه داریم؟

## محدودیت‌ها

`product/10-Permission-Architecture.md`: «مجوزها سیستم را محافظت می‌کنند؛ مسئولیت‌ها آگاهی می‌سازند — این دو هرگز نباید با هم اشتباه شوند.» AC-2: تنها Capability «اعتماد، توضیح‌پذیری و حاکمیت» مجاز به تصمیم دسترسی است.

## گزینه‌ها

۱) سیستم RBAC کامل. ۲) تکثیر Reality/Projection به‌ازای هر نقش. ۳) برچسب سبک `intended_audience` + فیلتر تحویل در Capability «ارتباط و روایت».

## تصمیم

هر Opportunity یک فیلد `intended_audience` حمل می‌کند (`owner_manager` | `receptionist_coordinator` | `both`). این یک برچسب **تناسب** است، نه یک تصمیم **مجوز**. ترتیب پردازش اجباری و غیرقابل‌تغییر (IC-14): (۱) AC-2 (Capability «اعتماد، توضیح‌پذیری و حاکمیت»، انحصاراً و همیشه اول) → (۲) فیلتر `intended_audience` (Capability «ارتباط و روایت») → (۳) وضعیت تعامل مختص actor.

**اصلاح چندمخاطبی (فاز ۳C):** `SEEN`/`ACKNOWLEDGED`/`DISMISSED` وضعیت‌های **مختص هر actor** هستند (رکورد تعامل جداگانه به‌ازای هر جفت Opportunity/actor، از طریق IC-13)، نه وضعیت سراسری Opportunity. رد یک Opportunity `both`-مخاطب توسط یک نقش، آن را برای نقش دیگر پنهان نمی‌کند.

## گزینه‌های رد‌شده

RBAC کامل و تکثیر Reality — هر دو پیچیدگی غیرضروری برای V1 و در تضاد با دستور صریح حداقل‌سازی معماری.

## پیامدها

هر Opportunity می‌تواند چند رکورد تعامل مستقل داشته باشد؛ سربار کوچک در ازای معنای صحیح محصولی.

## اثر بر اقتدار

بدون تغییر — هیچ Capability اقتدار جدید نمی‌گیرد.

## اثر بر مالکیت

بدون تغییر.

## اثر بر Interaction Contract

IC-14 (جدید).

## اثر بر Migration

بدون تأثیر بر مدل احراز هویت موجود Malino.

## مرز V1/V2

منحصراً V1.

## پرسش‌های باز باقی‌مانده

افزودن Doctor/Professional به `intended_audience` در V1.x — تصمیم محصولی آینده؛ معماری از قبل آماده است (فقط افزودن یک مقدار enum).

---

**تاریخچه‌ی کامل و بازبینی تخاصمی محفوظ است:** `ADR_Candidate_Role_Aware_Opportunity_Delivery.md`، `ADR_Candidate_Role_Aware_Opportunity_Delivery_v2.md`، `MLINO_PHASE_3B_FINAL_APPROVAL_REVIEW.md`.
