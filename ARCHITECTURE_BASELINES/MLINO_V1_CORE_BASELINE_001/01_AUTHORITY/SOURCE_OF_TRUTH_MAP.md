# نقشه‌ی منبع حقیقت (Source of Truth Map)

**وضعیت: به‌روزرسانی‌شده در فاز ۳D — همچنان یک راهنماست، نه خودش یک سند معماری مستقل.** نسخه‌ی پیشین (پیش از فاز ۳D) در `ARCHITECTURE_BASELINES/PRE_PHASE_3D/01_AUTHORITY/SOURCE_OF_TRUTH_MAP.md` محفوظ است.

---

## سلسله‌مراتب اقتدار معماری V1 حاکم (به ترتیب نزولی)

۱. **`architecture/Kernel_Architecture_v1.3_FROZEN.md`** — بالاترین اقتدار معماری. شامل الحاقیه‌ی v1.3 (تولیدکننده‌ی سیگنال دامنه، §۶/§۲۰).
۲. **`architecture/MLINO_Capability_Map_v1_FROZEN_FINAL.md`**
۳. **`capabilities/01-...` تا `capabilities/11-...`** — مشخصات Capability.
۴. **`architecture/Interaction_Contracts_v1.1_FROZEN.md`** — شامل IC-01 تا IC-14 (IC-13/IC-14 در v1.1 افزوده شدند).
۵. **`architecture/MLINO_Migration_Plan_v1.0_FROZEN.md`**
۶. **`architecture/architecture00_SYSTEM_OVERVIEW.md`** — مدل ذهنی مشترک فعال، بدون اقتدار مستقل.
۷. **`governance/ADR-*`** — تصمیمات رسمی در دامنه‌ی خودشان، شامل ADR-00X تا ADR-00AB (زنجیره‌ی حاکمیت هوش مصنوعی) **و اکنون ADR-00AC، ADR-00AD، ADR-00AE** (معماری Opportunity، تولیدکننده/Materiality، تحویل نقش‌آگاه — فاز ۳D).

## معماری Opportunity (جدید در فاز ۳D)

اسناد پشتیبان در `opportunity_architecture/` **اقتدار مستقل ندارند** — سطح REFERENCE یا IMPLEMENTATION-GUIDANCE، تابع ADR-00AC/00AD/00AE و IC-13/IC-14. جزئیات کامل طبقه‌بندی هرکدام در `opportunity_architecture/DOCUMENT_AUTHORITY_CLASSIFICATION.md`. **هیچ Worker Agent آینده نباید این اسناد پشتیبان را به‌عنوان معادل ADR/IC رسمی تلقی کند** — طبق دستور صریح بخش ۱۰ فاز ۳D.

## اقتدار محصولی (Product Authority)

پوشه‌ی `product/` کتاب مقدس محصول (D-4) باقی می‌ماند. `PRODUCT_DECISIONS_V1_CURRENT.md` (فاز ۳A) و کالیبراسیون‌های محصولی جدیدتر (مثل اصل Adaptive Execution) **PRODUCT VISION/PRODUCT DECISION هستند تا زمانی که رسماً در `product/` تلفیق شوند؛ هرگز معماری Frozen را نادیده نمی‌گیرند.**

## UX / AI / Foundation

این لایه‌ها بر اساس وضعیت خودشان زمینه‌ی محصول/تجربه/هوش مصنوعی می‌دهند اما نمی‌توانند به‌طور ضمنی معماری Frozen را اصلاح کنند.

## معماری تاریخی (Historical)

`architecture/_historical/` برای معماری V1 بدون اقتدار است. **همچنین:** اسناد غیر-`_v2` فاز ۳B و `ADR_Candidate_*` (فاز ۳B/۳C) اکنون HISTORICAL هستند — جایگزین‌شده توسط ADR-00AC/00AD/00AE و اسناد `_v2` در `opportunity_architecture/`.

## V2

`MLINO_v2_architecture/` مجزاست. مفاهیم V2 نباید برای پرکردن گپ‌های V1 استفاده شوند — این قاعده اکنون به‌طور خاص برای فضای نام `opportunity.*` (V1) در برابر مفهوم متفاوت «Opportunity» در معماری V2 (تبادل بین‌سازمانی) نیز صادق است؛ این دو هرگز نباید خلط شوند (PA-09، CLOSED).

## پیاده‌سازی و Legacy — همیشه پایین‌تر از معماری

**پیاده‌سازی Legacy Malino** (`C:\ml\malino-project17 tir\`) شواهد و پیاده‌سازی بالقوه‌ی قابل‌استفاده است — **هرگز خودِ معماری نیست.** طبقه‌بندی REUSE/WRAP/ADAPT/MIGRATE/REPLACE/RETIRE/UNKNOWN (`opportunity_architecture/LEGACY_HYBRID_BOUNDARY.md`) راهنمای پیاده‌سازی است، نه اقتدار معماری.

**بسته‌ی NestJS کشف‌شده در فاز ۳A** (`C:\mlino\MLINO_Architecture_Release\`) منشأ آن هنوز مستقل تأیید نشده است. این baseline **عمداً به آن بسته گره نخورده** — طبق دستور صریح بخش ۲۰ فاز ۳D. هر ارجاع آینده به آن بسته باید صراحتاً به‌عنوان «هدف استقرار احتمالی، نه منبع معماری» علامت‌گذاری شود.

**سند طراحی پیاده‌سازی** (`Implementation_Design_Phase_1_v1.0.md`، هرجا که یافت شود) IMPLEMENTATION DESIGN است، نه معماری — تابع تمام ADR/IC/Kernel بالا.

## حل تعارض

**معماری:** Kernel v1.3 → Capability Map → Capability Specs → Interaction Contracts v1.1 → ADRهای پذیرفته‌شده (شامل ADR-00AC/AD/AE) برنده است.
**محصول:** مشخص کن کدام‌یک (کتاب مقدس محصول زنده یا کالیبراسیون جدیدتر) مقصود اقتدار است؛ هرگز بی‌صدا ادغام نکن.
**پیاده‌سازی/Legacy:** همیشه پایین‌تر از معماری؛ هرگز معماری را به‌خاطر تطبیق با کد Legacy تغییر نده (طبق قاعده‌ی کنترل تغییر، بخش ۱۸ فاز ۳D).
**نامشخص:** OPEN/GAP — ثبت در رجیستری گپ، نه حدس.
