# FP02_IMPLEMENTATION_STATUS.md

**فاز:** FP-02 Core Implementation — پیاده‌سازی هسته‌ی Projection و پیاده‌سازی واقعی IC-14
**اجراکننده:** Claude
**تاریخ/ساعت تکمیل:** 2026-08-15 23:5x (زمان محلی سیستم)
**مرجع مجوز:** `AI_HANDOFF/CODEX_INSTRUCTIONS/20260815_2323_FP02_CORE_IMPLEMENTATION_AUTHORIZATION.md`
**شناسه دستور:** `CODEX-20260815-2323-FP02CORE`
**محدوده مجوز:** `IMPLEMENT_FP02_CORE_PROJECTION_AND_IC14_ONLY`

---

## ۱. وضعیت نهایی

**FP-02 CORE IMPLEMENTATION — READY FOR CENTRAL CODE REVIEW**

هر دو بخش مجاز این فاز به‌طور کامل پیاده‌سازی، تایپ‌چک، و با تست واقعی روی Postgres واقعی (نه Mock) تایید شدند:
1. **FP-02 Core Opportunity Projection** — بازسازی رویداد-محور (Event-Sourced) جداول `opportunity_current_state` و `opportunity_interaction_state` از `event_log`.
2. **پیاده‌سازی واقعی IC-14** (`OpportunityReadService`) — جایگزین قابل‌تعویض `MockIC14ReadInterface`، متصل به یک `AC2DecisionPort` تزریق‌شده.

هیچ مورد از فهرست ممنوعه‌ی دستور (معماری منجمد، ADR/IC، `shared-contracts/types.ts`، `prisma/schema.prisma`، FP-01، FP-03، کد منبع F-01 تا F-05، Mock IC-14 موجود، Legacy Malino، F-06/F-07/Voice) تغییر نکرد.

---

## ۲. هدف تکمیل‌شده

- ساخت `AC2DecisionPort` دقیقاً مطابق شکل نهایی‌شده در فاز 5B.3، به‌همراه یک نقطه‌ی مرکزی و واحد اجرای fail-closed (`evaluateAC2FailClosed`) که هیچ مسیر فراخوانی آینده نمی‌تواند آن را دور بزند.
- ساخت توابع محاسباتی خالص (Pure) Core Projection طبق قوانین CR-07 (`FP02_EVENT_SOURCED_PROJECTION_RULES.md`): جداسازی زنجیره‌ی کسب‌وکار از زنجیره‌ی تعامل، `as_of_time` صریح (بدون ساعت پنهان)، بدون ادغام (No-Merge) برای Opportunityهای مستقل با `situation_key` مشترک (CR-03).
- ساخت سرویس بازسازی (`rebuildOrganizationProjection`) با راهبرد تراکنشی حذف-و-درج‌مجدد (Delete-then-Reinsert)، محدود به هر سازمان، ایده‌آل و تعیین‌پذیر (Idempotent/Deterministic).
- ساخت `OpportunityReadService` با پیاده‌سازی دقیق توالی هفت‌مرحله‌ای IC-14: AC-2 → intended_audience → actor-state → group/sort.
- ساخت `FakeAC2DecisionPort` برای تست، بدون هیچ منطق تولیدی Governance واقعی (که در این فاز مجاز نبود).
- نگارش و اجرای موفق ۳۰ تست جدید روی Postgres واقعی (۱۲ تست Projection + ۱۸ تست IC-14 Read)، به‌علاوه تایید موفق مجدد ۴ تست SECURITY موجود F-04 در برابر پیاده‌سازی واقعی (نه فقط Mock).
- اجرای کامل Validation: `tsc --noEmit` تمیز، `prisma validate` موفق، کل مجموعه‌ی Jest (۱۰۵ تست، ۱۲ Suite) موفق بدون هیچ Retry یا Flake.

---

## ۳. آنچه عمداً خارج از محدوده ماند (طبق بند ۸ دستور)

- `SituationLookupInterface` و اتصال آن به Value Engineها — **پیاده‌سازی نشد**.
- هیچ راه‌حلی برای مسئله‌ی همزمانی/تکرار Opportunity (R5-Concurrency) — همچنان `CONTRACT GAP` باز است.
- هیچ منطق تصمیم Lifecycle در سمت Producer — **پیاده‌سازی نشد**.
- هیچ Adapter واقعی Governance/Malino — فقط رابط (`AC2DecisionPort`) و Fake تست ساخته شد.
- Wave 2، F-06/F-07، Voice/Telephone — به‌کلی لمس نشدند.

---

## ۴. منابع/Baselineهای استفاده‌شده

- `PHASE_5B1_FP02_DESIGN_REMEDIATION/05_PROJECTION/FP02_EVENT_SOURCED_PROJECTION_RULES.md` (CR-07)
- `PHASE_5B2_FINAL_SECURITY_CLOSURE/FP02_AC2_AND_EVIDENCE_DELIVERY_CONTRACT.md` (توالی هفت‌مرحله‌ای، سیاست S2)
- `PHASE_5B3_AC2_PORT_SHAPE_CORRECTION/AC2_DECISION_PORT_FINAL_DELTA.md` (شکل نهایی Port)
- `implementation/shared-contracts/types.ts` (فقط خوانده شد — بدون تغییر)
- `implementation/prisma/schema.prisma` (فقط خوانده شد — بدون تغییر)
- `implementation/test/mocks/mock-ic14-read-interface.ts` (فقط خوانده شد — بدون تغییر، بدون حذف)
- `implementation/test/feed/opportunity-feed.spec.ts` (فقط خوانده شد — بدون تغییر)
- `implementation/foundation/event-admission/admission-validator.ts` و `implementation/foundation/event-log/event-log.service.ts` (فقط خوانده شدند — بدون تغییر)

---

## ۵. یافته‌های باز / GAPهای مستند

هیچ GAP جدیدی این فاز باز نشد. GAPهای از پیش‌موجود (R5-Concurrency، اکثر سلول‌های AMENDMENT/RETRACTION در `LIFECYCLE_AUTHORITY_MATRIX.md`، محدودیت‌های معنایی `EvidenceRef`/`situation_key` در قرارداد منجمد) بدون تغییر باقی ماندند و در کد جدید به‌صراحت مستندسازی شدند (نه پنهان یا "حل‌شده" وانمود شدند).

**یک تصمیم طراحی خودتشخیصی (self-corrected)، نه خطای گزارش‌شده توسط کاربر:** فیلد `event_time` در `OpportunityProjectionDTO` ستون ذخیره‌شده‌ی متناظر در مدل Prisma `OpportunityCurrentState` ندارد (فقط `lastComputedAt` وجود دارد). چون تغییر `schema.prisma` بدون اثبات تناقض واقعی مجاز نبود، این با یک تابع کمکی (`fetchLatestEventTimes`) که زمان واقعی رویداد را از `event_log` از طریق `latestEventId` می‌خواند، حل شد — بدون هیچ تغییر Schema.

---

## ۶. توصیه‌ی گام بعدی

طبق دستور صریح و مکرر کاربر، **هیچ فاز بعدی به‌طور خودکار آغاز نمی‌شود.** توصیه برای Codex: بررسی مستقل این گزارش، ZIP بازبینی، و صدور دستور بعدی (تصحیح یا تایید و صدور مجوز فاز بعد — مثلاً `SituationLookupInterface` یا حل R5-Concurrency).
