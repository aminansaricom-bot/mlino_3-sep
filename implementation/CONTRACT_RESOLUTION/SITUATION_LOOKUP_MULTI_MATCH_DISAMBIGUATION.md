# تصمیم پیاده‌سازی — رفع ابهام «چند‌مورد» در `SituationLookupInterface`

## زمینه

دستور مجوز FP-02 Core Implementation (۱۵ آگوست ۲۰۲۶) صراحتاً `SituationLookupInterface` را از آن فاز مستثنا کرد، با این دلیل دقیق:

> «در صورت چند OCCURRENCE هم-`situation_key`، قرارداد خروجی تک‌موردی هنوز ابهام دارد.»

این سند دقیقاً همان ابهام را حل می‌کند — بدون تغییر قرارداد منجمد `SituationLookupResult` (که در CR-04، `PHASE_5B1_FP02_DESIGN_REMEDIATION/02_SITUATION_LOOKUP/SITUATION_LOOKUP_AND_CONCURRENCY_CORRECTION.md`، از قبل به‌عنوان یک خروجی تک‌موردی تثبیت شده بود).

## چرا این حالت اصلاً ممکن است

طبق CR-03 (همان سند)، قاعده‌ی «ادغام» به‌طور کامل حذف شد: هر رویداد `OCCURRENCE` — صرف‌نظر از این‌که `situation_key` آن با رویداد دیگری یکسان باشد یا نه — همیشه یک ردیف `OpportunityCurrentState` کاملاً مستقل با `opportunity_correlation_id` خودش می‌سازد. یعنی بیش از یک ردیف با همان `(organization_id, domain_tag, situation_key)` یک **پیامد قانونی و پیش‌بینی‌شده** است (مثلاً یک Race بین دو Worker، یا یک وضعیت قدیمی که منقضی شده و بعداً به‌طور مستقل دوباره رخ داده)، نه یک خطا.

## تصمیم

وقتی بیش از یک ردیف `OpportunityCurrentState` با `(organization_id, domain_tag, situation_key)` یکسان یافت شود، `SituationLookupService.getSituationState` **قطعی** (Deterministic) ردیفی را برمی‌گرداند که `latest_event_id` آن جدیدترین `event_time` را دارد (شکست تساوی بر پایه‌ی `id`، نزولی).

## چرا این یک «حل R5-Concurrency» نیست

- **هیچ ادغامی رخ نمی‌دهد.** هر ردیف در Projection دست‌نخورده و مستقل باقی می‌ماند و از طریق `OpportunityReadService` به‌طور کامل و جداگانه قابل‌خواندن است — این تصمیم فقط تعیین می‌کند این اینترفیس *مشاوره‌ای* تک‌موردی هنگام گزارش به فراخوان، کدام یک را گزارش دهد.
- **هیچ Constraint یا Migration جدیدی اضافه نشد.** ایندکس ترکیبی موجود روی `event_log` (`organizationId, domainTag, situationKey`) بدون تغییر کافی بود.
- **R5-Concurrency/Uniqueness هم‌چنان یک `CONTRACT GAP` باز و حل‌نشده است**، دقیقاً طبق طبقه‌بندی CR-04 — این سند فقط رفتار یک اینترفیس مشاوره‌ای را در برابر یک پیامد قانونی از آن Gap مشخص می‌کند، نه خودِ Gap را می‌بندد.

## سطح اختیار این تصمیم

**IMPLEMENTATION DESIGN** — یک انتخاب پیاده‌سازی قطعی و مستند برای یک اینترفیس implementation-level که از قبل تصویب شده بود، نه تغییری در معماری منجمد، Shared Contract، یا هر ADR/IC. اگر در آینده معلوم شود این انتخاب برای یک مصرف‌کننده‌ی خاص کافی نیست (مثلاً یک Value Engine به هر دو/همه‌ی ردیف‌های منطبق نیاز داشته باشد، نه فقط جدیدترین)، آن نیاز باید به‌صورت یک `CONTRACT_CHANGE_REQUEST` رسمی مطرح شود — نه با تغییر خاموش این تصمیم.

## مرجع پیاده‌سازی

`implementation/foundation/opportunity-projection/situation-lookup.service.ts` (کامنت داخلی کد نیز همین استدلال را عیناً حمل می‌کند)، تست‌های اثبات‌کننده در `implementation/test/foundation/opportunity-projection/situation-lookup.spec.ts` (سناریوی «multi-match»).
