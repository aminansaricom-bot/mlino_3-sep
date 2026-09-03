# گزارش — پیاده‌سازی SituationLookupInterface

## ۱. مجوز این کار

**بدون چرخه‌ی رسمی AI_HANDOFF Codex/ممد** — ممد در دسترس نبود؛ کاربر مستقیماً درخواست کرد: «SituationLookupInterface رو شروع کن». طبق همان الگوی خودارزیابی قبلی (`20260903_SELF_REVIEW_FP02_CLAUDE.md`)، این کار با اختیار مستقیم کاربر انجام شد، نه با یک دستور `CODEX_NEXT_INSTRUCTION.md`.

## ۲. وضعیت نهایی

**SituationLookupInterface — پیاده‌سازی کامل، تست‌شده، بدون Wiring به Value Engineها (طبق دامنه‌ی مصوب).**

## ۳. هدف انجام‌شده

پیاده‌سازی قرارداد implementation-level `SituationLookupInterface` دقیقاً طبق شکل نهایی‌شده در CR-04 (`PHASE_5B1_FP02_DESIGN_REMEDIATION/02_SITUATION_LOOKUP/SITUATION_LOOKUP_AND_CONCURRENCY_CORRECTION.md`) — یک Query مشاوره‌ای (Advisory) روی وضعیت Projection، بدون تصمیم چرخه‌ی حیات، بدون تضمین یکتایی.

## ۴. ابهامی که رفع شد (دلیل اصلی مستثنابودن این کار در فاز قبلی)

دستور مجوز ۱۵ آگوست FP-02 Core این اینترفیس را مستثنا کرده بود چون «قرارداد خروجی تک‌موردی هنوز ابهام دارد» برای حالتی که چند `OCCURRENCE` مستقل هم-`situation_key` باشند (که طبق CR-03 کاملاً قانونی است — بدون ادغام). این ابهام حل و مستند شد: `implementation/CONTRACT_RESOLUTION/SITUATION_LOOKUP_MULTI_MATCH_DISAMBIGUATION.md` — قطعی (Deterministic)، بر پایه‌ی جدیدترین `event_time`، بدون هیچ ادغام واقعی در Projection.

## ۵. فایل‌های ایجادشده

| فایل | نقش | چک‌سام SHA-256 |
|---|---|---|
| `implementation/foundation/opportunity-projection/situation-lookup.service.ts` | تعریف `SituationLookupInterface`/`SituationLookupResult` + پیاده‌سازی واقعی `SituationLookupService` | `39546b7dadaece18111eef8a7f8c0d2f91b424280deceb65b68085a5f05127ec` |
| `implementation/test/foundation/opportunity-projection/situation-lookup.spec.ts` | ۹ تست روی Postgres واقعی | `e0c64d467fe2688380a40bf84d97c44bf696f95d5a594c85def19fd2e7d364f8` |
| `implementation/CONTRACT_RESOLUTION/SITUATION_LOOKUP_MULTI_MATCH_DISAMBIGUATION.md` | سند تصمیم رفع ابهام چند-مورد | `ceff8bf617253c64750a49621271e9e51729f614898b52cb38f1a98e11f43747` |

**هیچ فایل موجودی تغییر نکرد** (نه `shared-contracts/types.ts`، نه `prisma/schema.prisma`، نه هیچ Value Engine). صفر Migration — ایندکس ترکیبی موجود `(organizationId, domainTag, situationKey)` روی `event_log` از قبل کافی بود.

## ۶. سناریوهای تست‌شده (۹ تست، همگی روی Postgres واقعی)

- `found:false` وقتی هیچ رویدادی این `situation_key` را حمل نمی‌کند.
- `found:false` وقتی رویداد بنیان‌گذار وجود دارد اما Projection هنوز بازسازی نشده (این Query وضعیت Projection را گزارش می‌دهد، نه `event_log` خام).
- `found:true` با `state:'ACTIVE'` درون بازه‌ی انقضا.
- `found:true` با `state:'EXPIRED'` پس از انقضا.
- `as_of` دقیقاً برابر `lastComputedAt` ردیف Projection است (نشانگر کهنگی)، نه ساعت لحظه‌ی خواندن.
- **سناریوی چند-مورد (Race قانونی طبق CR-03):** دو `OCCURRENCE` مستقل با `situation_key` مشترک → هر دو ردیف مستقل در Projection باقی می‌مانند (بدون ادغام)؛ Lookup قطعی جدیدترین را گزارش می‌دهد؛ ردیف قدیمی‌تر هم‌چنان کامل و قابل‌خواندن است.
- انزوای Tenant: همان `situation_key` در سازمان دیگر هرگز تداخل نمی‌کند.
- ناوردای معماری: بدون نوشتن در `event_log`/`opportunity_current_state`.
- ناوردای معماری: هرگز `submitEventCandidate` را فرا نمی‌خواند (Lookup ≠ تصمیم، طبق تاکید CR-04).

## ۷. اجرای کامل مجموعه‌ی تست

```
Test Suites: 13 passed, 13 total
Tests:       115 passed, 115 total
```

(۱۰۶ تست قبلی [شامل تصحیح خودارزیابی امروز] + ۹ تست جدید — همگی سبز، روی Postgres واقعی.)

## ۸. آنچه عمداً پیاده‌سازی نشد (طبق دامنه‌ی مصوب طراحی، نه یک محدودیت این پاس)

- **Wiring به Value Engineها (F-01/F-02/F-03)** — طبق `SITUATION_LOOKUP_AND_CONCURRENCY_CORRECTION.md`، این «مسیر مستقل» است و باید جداگانه انجام شود؛ در این پاس صراحتاً پیاده نشد.
- **R5-Concurrency/Uniqueness** — هم‌چنان یک `CONTRACT GAP` باز و حل‌نشده، دقیقاً طبق طبقه‌بندی CR-04. هیچ قفل توزیع‌شده، Constraint یکتای جدید، یا زیرساختی اختراع نشد.
- **منطق تصمیم OCCURRENCE-در-برابر-AMENDMENT در Value Engineها** — هم‌چنان مسئولیت آینده‌ی هر Value Engine است؛ این Lookup فقط داده‌ی خام برای آن تصمیم را فراهم می‌کند، خودش تصمیم نمی‌گیرد.

## ۹. یافته‌های باز / ریسک‌ها

بدون تغییر از فاز قبل — R5-Concurrency هم‌چنان OPEN. تصمیم رفع‌ابهام چند-مورد (بخش ۴) یک انتخاب پیاده‌سازی مستند است، نه راه‌حل آن Gap.

## ۱۰. اقدام بعدی

منتظر تصمیم کاربر — Wiring به یک Value Engine خاص، یا کار دیگری.
